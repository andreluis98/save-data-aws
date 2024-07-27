import { SQSEvent } from 'aws-lambda';
import { z, ZodError } from 'zod';
import { CreateSupermarketUseCase } from './use-cases/create-supermarket-use-case';
import { SupermarketRepository } from './bondaries/supermarket-repository';
import { PgSupermarketRepository } from './adapters/pg-supermarkets-repository';
import { DbConnection, PgConnection } from './adapters/pg-connection';
import { CreateProductUseCase } from './use-cases/create-product-use-case';
import { ProductRepository } from './bondaries/product-repository';
import { PgProductRepository } from './adapters/pg-product-repository';
import { CreateProductPriceUseCase } from './use-cases/create-product-price-use-case';
import { ProductPriceRepository } from './bondaries/product-price-repository';
import { PgProductPriceRepository } from './adapters/pg-product-price-repository';

export async function lambdaHandler(event: SQSEvent): Promise<void> {
    const recordsSchema = z.array(
        z.object({
            nfeId: z.string(),
            supermarketName: z.string(),
            cnpj: z.string(),
            address: z.string(),
            date: z.coerce.date(),
            items: z.array(
                z.object({
                    name: z.string(),
                    code: z.string(),
                    price: z.coerce.number(),
                }),
            ),
        }),
    );
    try {
        const records = recordsSchema.parse(event.Records.map((record) => {
            const body = JSON.parse(record.body);
            return {
                nfeId: body.nfeId,
                supermarketName: body.supermarketName,
                cnpj: body.cnpj,
                address: body.address,
                date: body.date,
                items: body.items.map((item: any) => ({
                    name: item.name,
                    code: item.code,
                    price: item.price,
                })),
            };
        }),
        );
        const dbConnection: DbConnection = new PgConnection(
            'postgresql://midasdb_qh22_user:RxGDWJVZ8A0UfDunrAjGzVdkaInlwnaa@dpg-cq7h7hmehbks738vhhq0-a.oregon-postgres.render.com/midasdb_qh22?ssl=true'
        );
        const supermarketRepository: SupermarketRepository = new PgSupermarketRepository(dbConnection);
        const productRepository: ProductRepository = new PgProductRepository(dbConnection);
        const ProductPriceRepository: ProductPriceRepository = new PgProductPriceRepository(dbConnection);
        const createSupermarketUseCase = new CreateSupermarketUseCase(supermarketRepository);
        const createProductUseCase = new CreateProductUseCase(productRepository);
        const crateProductPriceUseCase = new CreateProductPriceUseCase(ProductPriceRepository);

        for (let record of records) {
            await createSupermarketUseCase.execute({cnpj: record.cnpj, name: record.supermarketName, address: record.address});
            for (let item of record.items) {
                await createProductUseCase.execute({ code: item.code, name: item.name });
                await crateProductPriceUseCase.execute({ 
                    nfeId: record.nfeId,
                    date: record.date,
                    price: item.price,
                    productId: item.code,
                    supermarketId: record.cnpj,
                 });
            }

        }


    } catch (error: unknown) {
        if (error instanceof ZodError) {
            console.log(error.format());
            return;
        }
        if (error instanceof Error) {
            console.log(error.message);
            return;
        }
        console.log(error);
        return;
    }
};
