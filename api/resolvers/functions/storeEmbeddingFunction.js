import { util } from '@aws-appsync/utils'
export function request(ctx) { 
  return {
    "method": "POST",
    "resourcePath": `/vectors/upsert`,
    "params": {
      "headers": {
        "Content-Type": "application/json",
        "Api-Key": ctx.stash.pineconeApiKey
      },
      "body": JSON.stringify({
        "namespace": "computeless-rag",
        "vectors": [{
          "id": util.autoId(),
          "values": ctx.stash.queryEmbedding,
          "metadata": { "text": ctx.args.query }
        }]
      })
    }
  };
}
export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  if (ctx.result.statusCode === 200) {
    console.log("PINECONE - VECTOR UPSERT SUCCESS")
  } else {
    util.appendError(ctx.result.body, ctx.result.statusCode);
  }
}