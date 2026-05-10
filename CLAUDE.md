# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project

**whatssummarize** - see README.md and repo-local files for project-specific setup and commands.

## Baton Integration

Baton is the shared task graph for cross-repo work. When the `baton` MCP server is available, agents should check for existing work with `task_check` at the start of meaningful tasks, create or claim visible work with `task_notify`/`log_agent_message`, update the task when significant new information becomes available, and log completion or blockers before handing off.