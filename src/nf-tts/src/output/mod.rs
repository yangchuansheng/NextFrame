//! output module exports
pub mod event;
pub mod manifest;
pub mod naming;
pub mod srt;

pub(crate) fn write_stdout_line(args: std::fmt::Arguments<'_>) {
    use std::io::{self, Write};

    let mut stdout = io::stdout().lock();
    let _ = stdout.write_fmt(args);
    let _ = stdout.write_all(b"\n");
}

pub(crate) fn write_stderr_line(args: std::fmt::Arguments<'_>) {
    use std::io::{self, Write};

    let mut stderr = io::stderr().lock();
    let _ = stderr.write_fmt(args);
    let _ = stderr.write_all(b"\n");
}
