import { util } from '@aws-appsync/utils'
export function request(ctx) { 
  return {
    "version": "2018-05-29",
    "method": "POST",
    "resourcePath": `/`,
    "params": {
      "headers": {
        "content-type": "application/x-amz-json-1.1",
        "X-Amz-Target": "secretsmanager.GetSecretValue"
      },
      "body": JSON.stringify({
        "SecretId": "pineconeApiKey",
      })
    }
  }
}
export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  if (ctx.result.statusCode === 200) {
    ctx.stash.pineconeApiKey = JSON.parse(ctx.result.body).SecretString
  } else {
    util.appendError(ctx.result.body, ctx.result.statusCode);
  }
}