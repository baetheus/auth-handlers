use anyhow::{Context as ErrorContext, Result};
use std::env::var;

pub struct Context {
    pub hasura_secret: String,
    pub hasura_url: String,
    pub jwt_secret: String,
}

impl Context {
    pub fn from_env() -> Result<Context> {
        let hasura_secret = var("HASURA_SECRET").with_context(|| "HASURA_SECRET")?;
        let hasura_url = var("HASURA_URL").with_context(|| "HASURA_URL")?;
        let jwt_secret = var("JWT_SECRET").with_context(|| "JWT_SECRET")?;
        Ok(Context {
            hasura_secret,
            hasura_url,
            jwt_secret,
        })
    }
}
