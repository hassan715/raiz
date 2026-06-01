// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Passes execution to the core library logic in lib.rs
    raiz_lib::run();
}
