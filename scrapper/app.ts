import { SQSEvent } from 'aws-lambda';
import { z, ZodError } from 'zod';
import { CreateSupermarketUseCase } from './use-cases/create-supermarket-use-case';
import { SupermarketRepository } from './bondaries/supermarket-repository';
import { PgSupermarketRepository } from './adapters/pg-supermarkets-repository';
import { DbConnection, PgConnection } from './adapters/pg-connection';

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
        const dbConnection: DbConnection = new PgConnection("postgres://admin:admin@localhost:5433/my_db");
        const supermarketRepository: SupermarketRepository = new PgSupermarketRepository(dbConnection);
        const createSupermarketUseCase = new CreateSupermarketUseCase(supermarketRepository);

        for (let record of records) {
            await createSupermarketUseCase.execute({cnpj: record.cnpj, name: record.supermarketName, address: record.address});
            for (let item of record.items) {

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
