import { util } from '@aws-appsync/utils'
export function request(ctx) { 
  return {
    "version": "2023-09-30",
    "method": "POST",
    "resourcePath": `/model/amazon.titan-embed-text-v1/invoke`,
    "params": {
      "headers": {
        "content-type": "application/json",
        "accept": "*/*"
      },
      "body": JSON.stringify({
        "inputText": ctx.args.query,
      })
    }
  };
}
export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  if (ctx.result.statusCode === 200) {
    ctx.stash.queryEmbedding = JSON.parse(ctx.result.body).embedding
  } else {
    util.appendError(ctx.result.body, ctx.result.statusCode);
  }
}