# The Computeless RAG Tool ⭐️
Hey folks! I’m excited to share a project I’ve been working on that combines the powers of serverless architecture and generative AI to create something I like to call the Computeless RAG tool. This tool taps into private data (like your company's internal databases) and leverages GenAI without requiring any traditional AWS compute resources. It's all about making the Q&A process more efficient, and I think you’ll find the tech behind it pretty cool. So, let’s dive into how I built this Q&A tool.

## 1. What is the Computless RAG Tool 🤷🏽‍♂️ ?

The Computeless RAG tool is a prime example of utilizing AWS AppSync not just for managing GraphQL APIs but as an orchestrator for a serverless GenAI-driven query tool. This setup bypasses traditional compute resources, showcasing an alternative approach to deploying a GenAI application.

The main question I tried to address with this project was: Is it feasible to develop an effective GenAI-powered query tool solely using AWS AppSync and other serverless components? The answer lies in utilizing AppSync's JavaScript resolvers to manage complex workflows directly, which simplifies the architecture while enhancing response times and cost-effectiveness.

This project leverages Amazon Bedrock for accessing foundational models in a serverless manner, Pinecone as the vector database, and AppSync JS resolvers as the orchestrator. This integration demonstrates how AppSync can transcend its usual role, acting as the backbone of a peculiar serverless GenAI system.

## 2. Technological Overview 🛠️
Let's dive into the key technologies behind the Computeless RAG tool, explaining how each component plays a role in our workflow:

### 2.1 AWS AppSync
AWS AppSync is the central orchestrator for our project by leveraging JavaScript pipeline resolvers. This allows us to efficiently manage the sequence and context of data and requests throughout the query and response process.

### 2.2 AWS Secrets Manager
AWS Secrets Manager is used to secure sensitive credentials like the Pinecone API key, crucial for interfacing with our vector database.

### 2.3 Amazon Bedrock
Amazon Bedrock provides the AI power in our setup, serving two main functions:

- **Amazon Titan Text Embeddings**: This model transforms user queries into vector embeddings, crucial for querying our Pinecone database to fetch relevant data.
- **Anthropic Claude 3 Haiku**: After data retrieval, this model processes the information to generate accurate and contextually appropriate responses to the queries, leveraging its advanced natural language processing capabilities.

### 2.4 Pinecone
Pinecone serves as our vector database, essential for the efficient storage and quick retrieval of data vectors corresponding to user queries.

### 2.5 Integration Flow
The integration of these technologies is orchestrated through several steps:

1. **Secure API Key Retrieval**: Retrieve the Pinecone API key from AWS Secrets Manager to ensure secure access to our database.
2. **Embedding Generation**: Convert user queries into vector embeddings using the Titan model.
3. **Data Storage**: Insert vectors (and the corresponding text) into the Pinecone database for later retrieval.
4. **Data Retrieval**: Use these embeddings to locate the most relevant data vectors within the Pinecone database.
5. **Response Generation**: Employ Anthropic’s Claude 3 Haiku to formulate a final, contextual answer based on the retrieved data and the initial query.


## 3. Architecture and Workflow 🏗️

Let's now break down the architecture and workflow of the Computeless RAG tool, providing a detailed look at how each component interacts.

### 3.1 Architectural Overview
[Placeholder for Architecture Diagram]

The architecture diagram above shows the orchestration of services and data flow in our tool. The basic idea is that for each GraphQL query or mutation coming in on our AppSync API, a JavaScript pipeline resolver will be trigger. Each resolver will run a set of functions in sequence to interact with services, data source or to manipulate data for the next subsequent step.

### 3.2 AppSync Pipeline Resolver Functions
AWS AppSync supports a powerful feature called pipeline resolvers, which are essential for complex data operations requiring multiple steps. These resolvers allow you to define a series of function calls that are executed in a defined sequence, with each function able to transform the output and pass it to the next. This sequential data handling capability is particularly advantageous for workflows where data needs to be fetched, transformed, and used to generate responses — exactly what our Computeless RAG tool does.

**Why Use Pipeline Resolvers?**
1. Sequential Logic Execution: Pipeline resolvers execute a sequence of operations that depend on the output of the previous step, making them ideal for our use case where each step logically follows from the last.

2. Decoupling Logic and Data Sources: Each function in a pipeline can use different data sources or none at all. This flexibility allows for a cleaner architecture where data retrieval, processing, and response generation are clearly separated.

3. Efficiency and Performance: By managing the flow of data within AppSync, we minimize the need for external orchestration and reduce the latency associated with multiple network calls.

The logical progression through the pipeline is managed by individual JS files, each representing a function within our AppSync resolver. These functions are organized in the `api/resolvers/functions` folder within our SAM project, providing a clear and manageable structure for deployment and updates. Here’s how each function ties into the pipeline:

#### 3.2.1 Get Pinecone API Key Function (`getPineconeApiKeyFunction.js`)
This function kicks off the pipeline by securely retrieving the Pinecone API key from AWS Secrets Manager using an HTTP data source. Once retrieved, it stores the key in `ctx.stash` making it available to subsequent functions.

```javascript
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
```

#### 3.2.2 Generate Embedding Function (`generateEmbeddingFunction.js`)
After securing the API key, this function generates vector embeddings from the user's query. It uses an HTTP data source to send the query to Amazon Bedrock, which utilizes the Titan Text Embeddings foundational model to transform the query into into vector embeddings. This embedding process is essential for accurately matching the query with relevant data in Pinecone.

```javascript
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
```

#### 3.2.3 Store Embedding Function (`storeEmbeddingFunction.js`)
With an embedding in hand, this function stores private data in the Pinecone database to be queried later on. It uses an HTTP data source to perform this action.

```javascript
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
```

#### 3.2.4 Search Embeddings Function (`searchEmbeddingsFunction.js`)
With an embedding in hand, this function searches the Pinecone database to find the most relevant entries. It uses an HTTP data source to perform this query, fetching data that closely matches the user’s initial inquiry based on the embeddings generated previously.

```javascript
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
```

#### 3.2.5 Build Prompt Function (`buildPromptFunction.js`)
This function does not interact with any data sources and serves to assemble the final prompt. It constructs a comprehensive input for the AI model by combining the initial query, contextual data from Pinecone, and specific instructions for the language model. This step is vital for ensuring that the AI model generates relevant and accurate responses.

```javascript
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
```

#### 3.2.6 Invoke Model Function (`invokeModelFunction.js`)
The final function in the pipeline uses an HTTP data source to send the assembled prompt to Anthropic’s Claude 3 Haiku model via Amazon Bedrock. This function is responsible for obtaining the final answer to the user’s query, showcasing the GenAI’s capability to process and respond to complex inquiries effectively.

```javascript
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
```

### 3.3 Pipeline Resolvers

#### 3.3.1 `embedContext` Mutation

The `embedContext` mutation within our AppSync architecture plays as essential role in enriching our Pinecone database with actionable data. Specifically, this mutation addresses the need to continuously augment our database with private data that can later be queried effectively. When text data is submitted through this mutation, it is first converted into embeddings, preparing it for efficient and relevant retrieval.

The mutation will trigger a pipeline resolver composed out of the following functions in sequence:
  - getPineconeApiKeyFunction
  - generateEmbeddingFunction
  - storeEmbeddingFunction

#### 3.3.2 `rag` Query

The `rag` Query in our AppSync setup is the central functionality of the Computeless RAG tool, aiming to retrieve and generate responses based on user queries. This GraphQL query taps into our Pinecone database to deliver relevant answers based on private data.

The query will trigger a pipeline resolver composed out of the following functions in sequence:
  - getPineconeApiKeyFunction
  - generateEmbeddingFunction
  - searchEmbeddingsFunction
  - buildPromptFunction
  - invokeModelFunction

## 4. SAM Project Structure 📝
The AWS Serverless Application Model (SAM) is an open-source framework that simplifies creating and deploying serverless applications on AWS. In our Computeless RAG tool project, the SAM template (template.yaml) and the GraphQL schema (schema.graphql) are key components that define the infrastructure and the API interface respectively.

### 4.1 Overview of template.yaml
The template.yaml file defines the resources necessary for deploying the Computeless RAG tool on AWS. Here’s a breakdown of the primary components:

- **AWS::Serverless::GraphQLApi**: This resource creates the AppSync API. It uses the GraphQL schema provided in the schema.graphql file. The API is configured with API keys for authentication and connected to various data sources and resolvers for handling operations.

- **Functions**: Functions are defined for each step in the AppSync pipeline resolver, mapped to specific JavaScript files:
  - **getPineconeApiKeyFunction**: Retrieves the API key from AWS Secrets Manager.
  - **generateEmbeddingFunction**: Uses Amazon Bedrock to generate embeddings from the user's query.
  - **searchEmbeddingsFunction**: Queries the Pinecone database for relevant data.
  - **buildPromptFunction**: Assembles the prompt for the AI model without using a data source.
  - **invokeModelFunction**: Calls the AI model to generate the final response.
- **AWS::AppSync::DataSource**: Data sources are specified for connecting the functions to external services:

  1. **SecretsManagerDataSource**: Configured to interact with AWS Secrets Manager using HTTP. It's linked to an IAM role that allows it to fetch the API key.
  2. **PineconeDataSource**  
  3. **BedrockDataSource**: HTTP data sources configured to interact with Pinecone and Amazon Bedrock services.
- **AWS::IAM::Role**: Defines the roles required for the AppSync data sources to interact with AWS services securely. Each role includes policies that grant necessary permissions for actions like retrieving secrets or invoking AI models.

### 4.2 Understanding schema.graphql
The schema.graphql file defines the GraphQL schema used by the AppSync API. Here’s the structure:

```graphql
type QueryOutput { output: String! }
type Query { rag(query: String!): QueryOutput }

type MutationOutput { output: Boolean! }
type Mutation { embedContext(query: String!): MutationOutput }
```

This schema sets up a simple API with a single type of query (rag) that accepts a string and returns a QueryOutput type, which contains a string field output. This setup is designed to handle the Q&A functionality of your tool, allowing users to submit queries and receive text responses.

### 4.3 The AppSync resolver functions folder

As mentioned in section 3, the `api/resolvers/functions` folder contains the js files representing the AppSync resolver functions that will be executed in our pipeline resolver whenever the GraphQL `rag` is invoked.

### 4.4 Deploying the SAM project

Deploying this SAM project involves several steps that are streamlined by the SAM CLI, a command line tool that allows you to build, test, and deploy AWS serverless applications using SAM templates. Here’s how to deploy our project:

**Pre-Requisites:**

- Clone the project on your local computer
- Install AWS CLI and configure it with your AWS account credentials.
- Install the AWS SAM CLI.
- Create a Pinecone account, a Pinecone index with `1536` dimension (same as the output vector generated by Amazon Titan Text Embeddings) and copy the Pinecone API key and newly created index host from your account.
- Create a plaintext secret on AWS Secrets Manager. Name of the secret should be `pineconeApiKey` and value is the API key copied from your Pinecone account.
- Update the `YOUR_PINECONE_INDEX_HOST` in the `template.yaml` file with the value you copied from your Pinecone account. 

**Build the Project:**

- Navigate to the project directory in your terminal.
- Run the command: `sam build`. This command prepares the deployment by building any dependencies specified in the template.

**Deploy the Project:**

- After building the project, deploy it by running: `sam deploy --guided`.
  - The guided deployment process will prompt you to enter parameters such as the stack name, AWS region, and any parameters required by the template.
  - Confirm the settings and proceed with the deployment. The CLI will handle the creation of all specified resources and provide you with an output that includes the URL of the deployed AppSync API.


## 5. Testing the Computeless RAG Tool 🧪

Now that our Computeless RAG Tool is successfully deployed, let's go ahead and test it.

### 5.1 Populating our Pinecone index
In order to test our tool, we need to populate some data in our Pinecone database. In order to do so, we have deployed a mutation called `embedContext`. Let's add a few entries in our Pinecone index.

1. Navigate to the AWS AppSync console
2. Select the API you just deployed. It should be named `ComputelessRagApi`
3. Click on Queries
4. Paste the following in the query editor
    ```graphql
    mutation Mutation1 {
      embedContext(query: "Project Description: Fluffernutter Technologies is thrilled to announce its latest innovation, Project Tofu Thunderstorm. This groundbreaking technology aims to revolutionize the food industry by enabling cloud-based 3D printing of tofu with customizable shapes, flavors, and textures, directly into consumers' kitchens. Initial shapes include \"Lightning Bolt Lemon\" and \"Cumulus Cloud Curry.\"") {
        output
      }
    }
    mutation Mutation2 {
      embedContext(query: "Award Citation: For the first time in corporate history, Fluffernutter Technologies Inc. is proud to award the Employee of the Month to Garry the Goldfish. Garry has demonstrated exceptional dedication by swimming around his bowl approximately 3,572 times this month, inspiring his team with his relentless pursuit of... well, his tail. Garry's unwavering commitment to circling his bowl has set a new standard for persistence and determination at Fluffernutter.") {
        output
      }
    }
    mutation Mutation3 {
      embedContext(query: "Internal Memo: It's been revealed that the key ingredient in Fluffernutter's cafeteria's infamous \"Secret Sauce\" is not the exotic spice blend previously thought but is, in fact, just a generous dollop of plain, unsweetened yogurt. This revelation has shocked employees, many of whom had been on a quest to decode the recipe. The culinary team assures everyone that the yogurt is organic and sourced from cows that listen exclusively to classical music.") {
        output
      }
    }
    mutation Mutation4 {
      embedContext(query: "Event Recap: Fluffernutter Technologies hosted its annual Great Office Chair Race, where departments compete in a high-stakes relay race through the office corridors. This year’s winning team, \"The Speedy Swivellers,\" utilized a controversial but effective technique involving copious amounts of olive oil on the wheels and a propulsion system fashioned from repurposed computer fans. Questions about the fairness of their tactics were raised but ultimately dismissed in the spirit of innovation and fun.") {
        output
      }
    }
    mutation Mutation5 {
      embedContext(query: "Strategy Meeting Notes: The Q3 objective for Fluffernutter Technologies is to finalize the development of Project Unicorn, a secretive endeavor that seeks to create the world’s first holographic pet that can assist with coding tasks. Early prototypes suggest that the holographic unicorn, named \"CodeHoof,\" prefers JavaScript over Python but struggles with existential questions when debugging.") {
        output
      }
    }
    mutation Mutation6 {
      embedContext(query: "Investigation Report: A three-week investigation into the mystery of the disappearing donuts from the break room has concluded. The culprit, a highly intelligent and daring raccoon named Ricky, has been apprehended. Ricky had been using the company's prototype teleportation device, Project Wormhole Waffle, to enter and exit the premises undetected. In light of his ingenuity, Ricky has been offered an internship with the R&D team.") {
        output
      }
    }
    mutation Mutation7 {
      embedContext(query: "Memo to Staff: In an unprecedented move, Fluffernutter Technologies Inc. announces this year's corporate retreat will be held on Mars, in collaboration with SpaceY. Employees are reminded to submit their dietary preferences for space food and to complete their zero-gravity training by the end of the month. The HR department has assured all participants that Wi-Fi will be available to ensure uninterrupted productivity during the retreat.") {
        output
      }
    }
    mutation Mutation8 {
      embedContext(query: "Wellness Program Update: As part of its commitment to employee well-being, Fluffernutter Technologies has introduced a new mindfulness and meditation program led by AI-powered Mecha-Marmots. These robotic rodents are equipped with soothing LED eyes and emit calming nature sounds. Early feedback suggests a marked improvement in stress levels, although some employees find the Mecha-Marmots’ continuous mechanical chewing somewhat less than relaxing.") {
        output
      }
    }
    mutation Mutation9 {
      embedContext(query: "Internal Communication: To foster a unique company culture, Fluffernutter Technologies has developed its own secret language, FlufferSpeak. This language simplifies complex technological concepts into whimsical terms. For example, a \"bug\" is now referred to as a \"noodle,\" and \"debugging\" is \"noodle-nabbing.\" Employees are encouraged to use FlufferSpeak during meetings to lighten the mood and enhance team bonding.") {
        output
      }
    }
    ```
5. Run all 9 mutations by clicking on the `Run` button and selecting the corresponding mutation

### 5.2 Asking questions

Now that we have "private" data stored in our Pinecone index, we are able to query our tool.

1. Navigate to the AWS AppSync console
2. Select the API you just deployed.
3. Click on Queries
4. Paste the following in the query editor
    ```graphql
    query negativeQuery {
      rag(query: "Is Fluffernutter Technologies planning to hire snails in the foreseable future ?") {
        output
      }
    }
    query positiveQuery {
      rag(query: "What are we doing for employee wellbeing ?") {
        output
      }
    }
    ```
5. Run both queries by clicking on the `Run` button and selecting the corresponding query.
   1. With the negative query, the tool should mention it does not have the necessary information to answer your question.
   2. With the positive query, it should provide you with an answer incorporating information that you have inserted into your Pinecone index in the previous section.

### 5.3 Cleanup

In order to remove the AWS resources created in this tutorial, just run the followin command: `sam delete`

## 6. Conclusion 🌅
   
The journey through the development of the Computeless RAG tool has showcased how seamlessly serverless architectures can integrate with generative AI to handle complex queries directly from private datasets by leveraging AWS AppSync, Amazon Bedrock and Pinecone.

Further potential improvements and considerations to the Computeless RAG Tool are:

- **Amazon Cognito** could be used to authenticate users and authorize them to only access data of companies they belong to. Cognito seamlessly integrates with AWS AppSync.
- Each request on our API involves fetching secrets from **AWS Secrets Manager** through the `getPineconeApiKeyFunction`. This has 2 downsides:

  1. Paying for secret retrieval everytime a request comes in. This has to balanced out with the fact that you are not paying for compute resources (eg: Lambda functions (invocation and ms of run time))
  2. When logging is enabled on your AppSync API, the secret is printed in plaintext. Anyone having access to your Cloudwatch logs, would have access to your Pinecone API key. [Amazon Cloudwatch Logs data protection](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html) can however help in solving this issue.


Thank you for joining me on this exploration of the Computeless RAG Tool concept! I hope you had as much fun reading this as I had building the tool. You can find the code in the [following repo](https://github.com/aphilippartd/computeless-rag).