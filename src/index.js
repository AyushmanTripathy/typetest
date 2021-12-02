#!/usr/bin/env node

import { promisify } from "util";
import { spawn } from "child_process";
import { red, yellow, underscore } from "btss";
import request from "request";
import { readFileSync } from "fs";
import { createInterface } from "readline";

globalThis.log = (str) => console.log(str);
const req = promisify(request);

let config = loadConfig();

home()
async function home(n) {
  if (!n) {
    console.clear();
    log("Welcome to wpm");
    log("select a option");
  } else log("\n");
  log("[t] test");
  log("[s] settings");
  log("[q] quit");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  process.stdout.write("> ");
  rl.on("line", (data) => {
    data = data.trim();

    switch (data) {
      case "q":
        process.exit(0);
      case "t":
        rl.close();
        test();
        break;
      case "s":
        rl.close();
        settings();
        break;
      default:
        log(data + " is not a valid option");
        break;
    }
    process.stdout.write("> ");
  });
}

async function settings() {
  const editor = process.env.EDITOR || "vim";

  const child = spawn(
    editor,
    [new URL("../settings.json", import.meta.url).pathname],
    {
      stdio: "inherit",
    }
  );

  child.on("exit", (e, code) => {
    config = loadConfig("");
    home();
  });
}

function loadConfig() {
  try {
    return JSON.parse(
      readFileSync(new URL("../settings.json", import.meta.url))
    );
  } catch (e) {
    log(red("couldn't load settings.json"));
    log(e);
  }
}

async function test() {
  const words = await getPara();

  let index = 0;
  testFrame(words, index);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let count = 0;
  let time = new Date().getTime();
  rl.on("line", (data) => {
    data = data.trim();

    if (data == "q") index = words.length - 1;
    else if (data == words[index]) count++;
    else words[index] = underscore(words[index]);

    index += 1;
    if (index == words.length) {
      rl.close();

      time = (new Date().getTime() - time) / 60000;
      log(
        `\nYou got ${count} out of ${words.length} words correct in ${round(
          time,
          2
        )} min`
      );
      log("wpm : " + Math.round(count / time));

      return home(true);
    }
    testFrame(words, index);
  });
}

async function testFrame(words, index) {
  console.clear();

  log(
    `${words.slice(0, index).join(" ")} ${yellow(words[index])} ${
      index != words.length - 1 ? words.slice(index + 1).join(" ") : ""
    }`
  );
  process.stdout.write("> ");
}

async function getPara() {
  let { body } = await req("https://randomword.com/paragraph");
  body = body
    .match(/<div id="random_word_definition">(.*)<\/div>/g)[0]
    .slice(33, -6);
  if (!config.case_sensitive) body = body.toLowerCase();
  if (config.albhabets_only) return body.match(/[a-z]+/gi);
  return body.split(" ");
}

function round(value, decimals) {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
}
