export function request(ctx) {
  return {};
}

export function response(ctx) {
  return { output: ctx.stash.queryAnswer }
}