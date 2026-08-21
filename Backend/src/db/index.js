import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { config } from '../config/index.js'

let connected = false
let memServer = null

export async function connectMongo() {
  if (connected) return

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    })
    connected = true
    console.log('[MongoDB] Connected to', config.mongoUri)
    return
  } catch (err) {
    console.warn('[MongoDB] Real instance unavailable, starting in-memory server...')
  }

  memServer = await MongoMemoryServer.create()
  const uri = memServer.getUri()
  await mongoose.connect(uri)
  connected = true
  console.log('[MongoDB] In-memory server running at', uri)
}

export async function disconnectMongo() {
  if (!connected) return
  await mongoose.disconnect()
  if (memServer) {
    await memServer.stop()
    memServer = null
  }
  connected = false
}

export { mongoose }
