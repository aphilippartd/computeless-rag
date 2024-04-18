import { util } from '@aws-appsync/utils'
export function request(ctx) { 
  return {
    "version": "2023-09-30",
    "method": "POST",
    "resourcePath": `/model/anthropic.claude-3-haiku-20240307-v1:0/invoke`,
    "params": {
      "headers": {
        "content-type": "application/json",
        "accept": "*/*"
      },
      "body": JSON.stringify({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": ctx.stash.prompt
              }
            ]
          }
        ]
      })
    }
  }
}
export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  if (ctx.result.statusCode === 200) {
    ctx.stash.queryAnswer = JSON.parse(ctx.result.body).content[0].text
  } else {
    util.appendError(ctx.result.body, ctx.result.statusCode);
  }
}