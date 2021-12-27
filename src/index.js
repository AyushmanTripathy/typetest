#!/usr/bin/env node

import { promisify } from "util";
import { spawn } from "child_process";
import { red, bold, yellow, underline } from "btss";
import request from "request";
import { homedir } from "os";
import { unlinkSync, existsSync, readFileSync, writeFile } from "fs";
import { createInterface } from "readline";

globalThis.log = (str) => console.log(str);
const req = promisify(request);

const config_path = homedir() + "/.config/.typetest.json";
const data_path = homedir() + "/.config/.typetest.data.json";

let config = loadJson(config_path, "settings");
let data = loadJson(data_path, "data");

home();
async function home(n) {
  if (!n) {
    console.clear();
    log(bold("Welcome to typetest"));
    log("-------------------");
    log("Current average : " + data.average);
    log("Best : " + data.best);
    log("Last score : " + (data.scores.length ? last(data.scores) : "none"));
  }
  log(`\n[t] test`);
  log(`[s] settings`);
  log(`[r] reset`);
  log(`[q] quit`);

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
      case "r":
        reset();
        break;
      default:
        log(red(data + " is not a valid option"));
        break;
    }
    process.stdout.write("> ");
  });
}

async function settings() {
  const editor = process.env.EDITOR || "vim";

  const child = spawn(editor, [config_path], {
    stdio: "inherit",
  });

  child.on("exit", (e, code) => {
    config = loadJson(config_path, "settings");
    home();
  });
}

function loadJson(path, from) {
  log(from);
  if (!existsSync(path)) {
    const data = readFileSync(relativePath("../" + from + ".json"));
    writeFile(path, data, () => {});
    return JSON.parse(data);
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    unlinkSync(path);
    return loadConfig(path, from);
  }
}

function relativePath(path) {
  return new URL(path, import.meta.url);
}

async function test() {
  const words = await getPara();
  words.unshift("");

  let index = 0;
  testFrame(words, index);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let count = 0;
  let time;
  rl.on("line", (input) => {
    input = input.trim();
    if (!time) time = new Date().getTime();

    if (input == "q") index = words.length - 1;
    else if (!input);
    else if (input == words[index]) count++;
    else words[index] = underline(words[index]);

    index += 1;
    if (index == words.length) {
      rl.close();

      time = (new Date().getTime() - time) / 60000;
      if (time) {
        log(
          `\nYou got ${count} out of ${words.length} words correct in ${round(
            time,
            2
          )} min`
        );
        const wpm = Math.round(count / time);
        log("wpm : " + wpm);
        data.scores.push(wpm);
        data.average = Math.round(
          data.scores.reduce((acc, cur) => acc + cur, 0) /
            (data.scores.length + 1)
        );
        log("average : " + data.average);

        if (data.best <= wpm) {
          data.best = wpm;
          log("This is your all time best!, congrats 🎉");
        }

        save(data);
      }
      return home(true);
    }
    testFrame(words, index);
  });
}

function save(data) {
  writeFile(data_path, JSON.stringify(data), () => {});
}

async function testFrame(words, index) {
  console.clear();
  log("[Enter] to start");
  log("[q] to stop the test\n");
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

function last(arr) {
  return arr[arr.length - 1];
}

function reset() {
  data = {
    scores: [],
    average: 0,
    best: 0,
  };
  save(data);
}
