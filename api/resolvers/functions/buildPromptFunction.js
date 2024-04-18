export function request(ctx) { return {} }
export function response(ctx) {
  ctx.stash.prompt = `
    <Question> ${ctx.args.query}</Question>
    <Contextual Information>: 
      *${ctx.stash.queryContexts.join("\n*")}
    </Contextual Information>
    <Instructions>
      1. Provide a direct and concise answer to the question based on your knowledge, without explicitly referencing or mentioning the provided "Contextual Information".
      2. Respond as an HR assistant who has internalized the relevant information, without indicating separate context pieces or referencing them directly.
      3. If you do not have enough information to answer the question, respond with 'I do not have the necessary information to answer.', nothing more, nothing less.
      4. Avoid any meta-references to the process of consulting the "Contextual Information" provided or the structure of this query.
      5. Keep your answer as short as possible while still fully addressing the question.
      6. Validate that you are complying to ALL the above instructions before answering any question.
    </Instructions>
    Your Answer:
  `
}