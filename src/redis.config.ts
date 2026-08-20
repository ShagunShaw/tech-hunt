import { createClient } from 'redis'

const client= createClient()

client.on('error', err => console.log('Redis Client Error: ', err))

export default client           // to be used across multiple files



// Another separate configuration for BullMQ:  BullMQ handles its own connection internally using this config
export const redisConnection = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
}