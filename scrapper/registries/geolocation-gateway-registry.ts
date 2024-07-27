import { GeoLocationGateway } from "../bondaries/geolocation-gateway";


export class GeolocationGatewayRegistry {
    private static instance?: GeolocationGatewayRegistry;
    private geolocationGateway?: GeoLocationGateway;
    
    private constructor() {}

    public setGeolocationGateway(geolocationGateway: GeoLocationGateway) {
        this.geolocationGateway = geolocationGateway;
    }

    public getGeolocationGateway(): GeoLocationGateway {
        if(!this.geolocationGateway){
            throw new Error("GeolocationGateway not registered yet")
        }
        return this.geolocationGateway;
    }

    public static getInstance() {
        if(!this.instance){
            this.instance = new GeolocationGatewayRegistry();
        }
        return this.instance;
    }
}