use std::fs;

use anyhow::Result;
use clap::{Parser, Subcommand};
use kiro_monitor::{MonitorContext, cli_fixture, scan_repo};

#[derive(Debug, Parser)]
#[command(name = "kiro-monitor")]
#[command(about = "Rust live blast-radius monitor for Kiro coding-agent worktrees")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    Scan {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        context: Option<String>,
        #[arg(long)]
        json: bool,
    },
    Fixtures {
        name: String,
        #[arg(long)]
        json: bool,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Scan { repo, context, .. } => {
            let context = parse_context(context)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&scan_repo(&repo, context)?)?
            );
        }
        Command::Fixtures { name, .. } => {
            println!("{}", serde_json::to_string_pretty(&cli_fixture(&name)?)?);
        }
    }
    Ok(())
}

fn parse_context(context: Option<String>) -> Result<MonitorContext> {
    let Some(value) = context else {
        return Ok(MonitorContext::default());
    };
    let json = if value.trim_start().starts_with('{') {
        value
    } else {
        fs::read_to_string(value)?
    };
    Ok(serde_json::from_str(&json)?)
}
