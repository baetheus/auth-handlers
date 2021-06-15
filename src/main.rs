use anyhow::{anyhow, Result};
use dropshot::*;

mod context;
mod login;
mod register;
mod hasura;

#[tokio::main]
async fn main() -> Result<()> {
    let context = context::Context::from_env()?;

    let config: ConfigDropshot = Default::default();

    let log = ConfigLogging::StderrTerminal {
        level: ConfigLoggingLevel::Debug,
    }
    .to_logger("auth-handler")?;

    let mut api = ApiDescription::new();

    // Register API functions
    api.register(register::register_handler).unwrap();
    api.register(login::login_handler).unwrap();

    let server = HttpServerStarter::new(&config, api, context, &log)?.start();

    server.await.map_err(|msg| anyhow!(msg))
}
