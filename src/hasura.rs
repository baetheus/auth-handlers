use anyhow::Result;
use async_trait::async_trait;
use graphql_client::{GraphQLQuery};

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "graphql/schema.json",
    query_path = "graphql/create_user.graphql",
    response_derives = "Debug"
)]
pub struct CreateUserMutation;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "graphql/schema.json",
    query_path = "graphql/get_user.graphql",
    response_derives = "Debug"
)]
pub struct GetUserQuery;

pub type CreateUserRequest = create_user_mutation::Variables;
pub type CreateUserResponse = create_user_mutation::ResponseData;

pub type GetUserRequest = get_user_query::Variables;
pub type GetUserResponse = get_user_query::ResponseData;

#[async_trait]
trait HasuraClient {
    async fn create_user(req: CreateUserRequest) -> Result<CreateUserResponse>;
    async fn get_user(req: GetUserRequest) -> Result<GetUserResponse>;
}


