import { util } from '@aws-appsync/utils'
export function request(ctx) { 
  return {
    "method": "POST",
    "resourcePath": `/query`,
    "params": {
      "headers": {
        "Content-Type": "application/json",
        "Api-Key": ctx.stash.pineconeApiKey
      },
      "body": JSON.stringify({
        "namespace": "computeless-rag",
        "vector": ctx.stash.queryEmbedding,
        "topK": 3,
        "includeMetadata": true
      })
    }
  };
}
export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  if (ctx.result.statusCode === 200) {
    ctx.stash.queryContexts = JSON.parse(ctx.result.body).matches.map(match => match.metadata.text)
  } else {
    util.appendError(ctx.result.body, ctx.result.statusCode);
  }
}