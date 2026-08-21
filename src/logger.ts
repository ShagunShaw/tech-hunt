import winston from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';

const transports = [];

// 1. Only log to Console/File if in Development
if (process.env.NODE_ENV === 'development') {
    transports.push(
        new winston.transports.File({ filename: 'combined.log' })
    );
}

// 2. Only log to Axiom if in Production
if (process.env.NODE_ENV === 'production') {
    const axiomDataset = process.env.AXIOM_DATASET_NAME;
    const axiomToken = process.env.AXIOM_INGEST_TOKEN;

    if (axiomDataset && axiomToken) {
        transports.push(
            new AxiomTransport({
                dataset: axiomDataset,
                token: axiomToken,
            })
        );
    }
    else 
    {
        throw new Error("Either axiom token or dataset name is not found in the .env file")
    }
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: transports,
});

export default logger;

All done, now you can log in any file you want using logger.info(), logger.error(), logger.warn(), etc.