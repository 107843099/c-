const examples = [
  {
    id: "digit-count",
    name: "数字统计",
    input: "220 230",
    code: `#include <iostream>
using namespace std;
int main()
{
    long long a, b;
    cin >> a >> b;
    long t = 0;
    for (int i = a; i <= b; i++)
    {
        int k = i;
        int q = 0;
        while (k)
        {
            if (k % 10 == 2)
            {
                q++;
            }
            k = k / 10;
        }
        if (q == 3)
        {
            t++;
        }
    }
    cout << t;
    return 0;
}`,
  },
  {
    id: "bubble-sort",
    name: "数组排序",
    input: "",
    code: `#include <iostream>
using namespace std;
int main()
{
    int a[5] = {5, 1, 4, 2, 3};
    for (int i = 0; i < 5; i++)
    {
        for (int j = 0; j < 4; j++)
        {
            if (a[j] > a[j + 1])
            {
                swap(a[j], a[j + 1]);
            }
        }
    }
    cout << a[0] << " " << a[1] << " " << a[2] << " " << a[3] << " " << a[4];
    return 0;
}`,
  },
  {
    id: "prefix-sum",
    name: "前缀和",
    input: "3 1 4 1 5",
    code: `#include <iostream>
using namespace std;
int main()
{
    int a[5];
    int s[5];
    cin >> a[0] >> a[1] >> a[2] >> a[3] >> a[4];
    s[0] = a[0];
    for (int i = 1; i < 5; i++)
    {
        s[i] = s[i - 1] + a[i];
    }
    cout << s[4];
    return 0;
}`,
  },
];

const codeInput = document.querySelector("#codeInput");
const inputData = document.querySelector("#inputData");
const outputBox = document.querySelector("#outputBox");
const stage = document.querySelector("#stage");
const stepTitle = document.querySelector("#stepTitle");
const stepCounter = document.querySelector("#stepCounter");
const currentCode = document.querySelector("#currentCode");
const memoryOverview = document.querySelector("#memoryOverview");
const messageBox = document.querySelector("#messageBox");
const timeline = document.querySelector("#timeline");
const runButton = document.querySelector("#runButton");
const backButton = document.querySelector("#backButton");
const nextButton = document.querySelector("#nextButton");
const playButton = document.querySelector("#playButton");
const resetButton = document.querySelector("#resetButton");
const loadExample = document.querySelector("#loadExample");
const exampleSelect = document.querySelector("#exampleSelect");
const speedInput = document.querySelector("#speedInput");
const MAX_EXECUTION_STEPS = 50000;
const MAX_RENDERED_FRAMES = 15000;

let frames = [emptyFrame()];
let currentIndex = 0;
let playing = false;
let playTimer = null;
let animating = false;

populateExamples();
loadSelectedExample(false);
renderFrame(frames[0]);
setControls();

runButton.addEventListener("click", () => {
  compileAndRun();
});

loadExample.addEventListener("click", () => {
  loadSelectedExample(true);
});

exampleSelect.addEventListener("change", () => {
  loadSelectedExample(false);
});

resetButton.addEventListener("click", () => {
  pause();
  currentIndex = 0;
  renderFrame(frames[currentIndex]);
  setControls();
});

nextButton.addEventListener("click", () => {
  pause();
  goToStep(currentIndex + 1, true);
});

backButton.addEventListener("click", () => {
  pause();
  goToStep(currentIndex - 1, false);
});

playButton.addEventListener("click", () => {
  if (playing) {
    pause();
    return;
  }
  if (currentIndex >= frames.length - 1) {
    currentIndex = 0;
    renderFrame(frames[currentIndex]);
  }
  playing = true;
  playButton.textContent = "Ⅱ";
  schedulePlay();
});

timeline.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-step]");
  if (!button) return;
  pause();
  goToStep(Number(button.dataset.step), false);
});

function compileAndRun() {
  pause();
  try {
    frames = buildFrames(codeInput.value, inputData.value);
    currentIndex = 0;
    messageBox.textContent = "";
    renderFrame(frames[currentIndex]);
  } catch (error) {
    frames = [emptyFrame()];
    currentIndex = 0;
    renderFrame(frames[0]);
    messageBox.textContent = error.message;
  }
  setControls();
}

function populateExamples() {
  examples.forEach((example) => {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.name;
    exampleSelect.append(option);
  });
}

function loadSelectedExample(shouldRun) {
  const example = examples.find((item) => item.id === exampleSelect.value) ?? examples[0];
  codeInput.value = example.code;
  inputData.value = example.input;
  if (shouldRun) {
    compileAndRun();
    return;
  }
  pause();
  frames = [emptyFrame()];
  currentIndex = 0;
  messageBox.textContent = "";
  renderFrame(frames[0]);
  setControls();
}

function schedulePlay() {
  clearTimeout(playTimer);
  if (!playing) return;
  if (currentIndex >= frames.length - 1) {
    pause();
    return;
  }
  const delay = Number(speedInput.value) + 120;
  goToStep(currentIndex + 1, true).then(() => {
    if (playing) {
      playTimer = setTimeout(schedulePlay, delay);
    }
  });
}

function pause() {
  playing = false;
  playButton.textContent = "▶";
  clearTimeout(playTimer);
}

async function goToStep(nextIndex, animate) {
  if (animating) return;
  if (nextIndex < 0 || nextIndex >= frames.length) return;

  const previous = frames[currentIndex];
  const next = frames[nextIndex];
  currentIndex = nextIndex;

  if (animate && nextIndex > 0) {
    animating = true;
    setControls();
    renderFrame(previous, next.event);
    await animateEvent(previous, next);
    renderFrame(next);
    animating = false;
  } else {
    renderFrame(next);
  }
  setControls();
}

function buildFrames(source, inputText = "") {
  const tokens = tokenizeProgram(sanitizeSource(source));
  const program = parseProgram(tokens);
  const runtime = {
    state: createState(),
    frames: [emptyFrame()],
    inputValues: inputText.trim() ? inputText.trim().split(/\s+/) : [],
    inputCursor: 0,
    loopDepth: 0,
    declarationRole: null,
    steps: 0,
  };

  executeNodes(program, runtime);
  return runtime.frames;
}

function sanitizeSource(source) {
  let clean = source.replace(/\/\/.*$/gm, "");
  clean = clean.replace(/^\s*#.*$/gm, "");
  clean = clean.replace(/^\s*using\s+namespace\s+\w+\s*;\s*$/gm, "");

  if (/\b(?:int|void)\s+main\s*\(\s*\)/.test(clean)) {
    clean = clean.replace(/^[\s\S]*?\b(?:int|void)\s+main\s*\(\s*\)\s*\{?/, "");
    clean = clean.replace(/}\s*$/, "");
  }

  return clean;
}

function tokenizeProgram(source) {
  const tokens = [];
  let current = "";
  let line = 1;
  let startLine = 1;
  let parenDepth = 0;
  let initializerDepth = 0;

  const flushStatement = () => {
    const text = current.trim();
    if (text) tokens.push({ type: "stmt", text, line: startLine });
    current = "";
  };

  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === "\n") {
      if (!current.trim()) startLine = line + 1;
      current += char;
      line += 1;
      continue;
    }

    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth = Math.max(0, parenDepth - 1);

    if ((char === "{" || char === "}" || char === ";") && !current.trim()) {
      startLine = line;
    }

    if (char === "{" && parenDepth === 0) {
      if (!isBlockHeader(current.trim())) {
        initializerDepth += 1;
        current += char;
        continue;
      }
      flushStatement();
      tokens.push({ type: "open", line });
      startLine = line;
      continue;
    }

    if (char === "}" && parenDepth === 0) {
      if (initializerDepth > 0) {
        initializerDepth -= 1;
        current += char;
        continue;
      }
      flushStatement();
      tokens.push({ type: "close", line });
      startLine = line;
      continue;
    }

    if (char === ";" && parenDepth === 0 && initializerDepth === 0) {
      flushStatement();
      startLine = line;
      continue;
    }

    if (!current.trim() && !/\s/.test(char)) startLine = line;
    current += char;
  }

  flushStatement();
  return tokens;
}

function isBlockHeader(text) {
  return /^(?:for|while|if)\s*\(/.test(text) || text === "else" || text === "";
}

function parseProgram(tokens) {
  const parsed = parseBlock(tokens, 0);
  if (parsed.index < tokens.length) {
    throw new Error(`第 ${tokens[parsed.index].line} 行多余的 }`);
  }
  return parsed.nodes;
}

function parseBlock(tokens, index) {
  const nodes = [];
  let cursor = index;

  while (cursor < tokens.length && tokens[cursor].type !== "close") {
    if (tokens[cursor].type !== "stmt") {
      throw new Error(`第 ${tokens[cursor].line} 行缺少语句`);
    }

    const parsed = parseNode(tokens, cursor);
    nodes.push(parsed.node);
    cursor = parsed.index;
  }

  return { nodes, index: cursor };
}

function parseNode(tokens, index) {
  const token = tokens[index];
  const forMatch = token.text.match(/^for\s*\(([\s\S]+)\)$/);
  if (forMatch) {
    const body = parseBracedBody(tokens, index + 1, token.line, "for");
    const parts = splitForParts(forMatch[1], token.line);
    return {
      node: {
        type: "for",
        init: parts[0],
        condition: parts[1],
        update: parts[2],
        body: body.nodes,
        line: token.line,
        text: token.text,
      },
      index: body.index,
    };
  }

  const whileMatch = token.text.match(/^while\s*\(([\s\S]+)\)$/);
  if (whileMatch) {
    const body = parseBracedBody(tokens, index + 1, token.line, "while");
    return {
      node: { type: "while", condition: whileMatch[1], body: body.nodes, line: token.line, text: token.text },
      index: body.index,
    };
  }

  const ifMatch = token.text.match(/^if\s*\(([\s\S]+)\)$/);
  if (ifMatch) {
    const thenBody = parseBracedBody(tokens, index + 1, token.line, "if");
    let elseBody = [];
    let cursor = thenBody.index;
    if (tokens[cursor]?.type === "stmt" && tokens[cursor].text === "else") {
      const parsedElse = parseBracedBody(tokens, cursor + 1, tokens[cursor].line, "else");
      elseBody = parsedElse.nodes;
      cursor = parsedElse.index;
    }
    return {
      node: {
        type: "if",
        condition: ifMatch[1],
        thenBody: thenBody.nodes,
        elseBody,
        line: token.line,
        text: token.text,
      },
      index: cursor,
    };
  }

  if (token.text === "else") {
    throw new Error(`第 ${token.line} 行 else 前面没有可匹配的 if`);
  }

  return { node: { type: "stmt", text: token.text, line: token.line }, index: index + 1 };
}

function splitForParts(text, line) {
  const parts = [];
  let current = "";
  let depth = 0;

  for (const char of text) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === ";" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());

  if (parts.length !== 3) {
    throw new Error(`第 ${line} 行 for 需要写成 for(初始化; 条件; 步进)`);
  }
  return parts;
}

function parseBracedBody(tokens, index, line, keyword) {
  if (tokens[index]?.type !== "open") {
    throw new Error(`第 ${line} 行 ${keyword} 后面需要使用 { } 包住代码块`);
  }
  const parsed = parseBlock(tokens, index + 1);
  if (tokens[parsed.index]?.type !== "close") {
    throw new Error(`第 ${line} 行 ${keyword} 代码块缺少 }`);
  }
  return { nodes: parsed.nodes, index: parsed.index + 1 };
}

function executeNodes(nodes, runtime) {
  for (const node of nodes) {
    executeNode(node, runtime);
  }
}

function executeNode(node, runtime) {
  guardStep(runtime, node.line);

  if (node.type === "stmt") {
    const executions = executeStatement(node.text, runtime, node.line);
    executions.forEach((execution) => pushExecution(runtime, execution, node.text, node.line));
    return;
  }

  if (node.type === "if") {
    const conditionValue = evaluateExpression(node.condition, runtime.state, node.line);
    pushFrame(runtime, {
      title: `第 ${node.line} 行：if(${node.condition}) 为 ${conditionValue ? "true" : "false"}`,
      line: node.line,
      code: node.text,
      event: { type: "none" },
    });
    executeNodes(conditionValue ? node.thenBody : node.elseBody, runtime);
    return;
  }

  if (node.type === "while") {
    while (true) {
      guardStep(runtime, node.line);
      const conditionValue = evaluateExpression(node.condition, runtime.state, node.line);
      pushFrame(runtime, {
        title: `第 ${node.line} 行：while(${node.condition}) 为 ${conditionValue ? "true" : "false"}`,
        line: node.line,
        code: node.text,
        event: { type: "none" },
      });
      if (!conditionValue) break;
      executeLoopBody(node.body, runtime);
    }
    return;
  }

  if (node.type === "for") {
    if (node.init) {
      const executions = withDeclarationRole(runtime, "iterator", () => executeStatement(node.init, runtime, node.line));
      executions.forEach((execution) => pushExecution(runtime, execution, node.init, node.line));
    }

    while (true) {
      guardStep(runtime, node.line);
      const conditionValue = node.condition ? evaluateExpression(node.condition, runtime.state, node.line) : 1;
      pushFrame(runtime, {
        title: `第 ${node.line} 行：for 条件 ${node.condition || "true"} 为 ${conditionValue ? "true" : "false"}`,
        line: node.line,
        code: node.text,
        event: { type: "none" },
      });
      if (!conditionValue) break;
      executeLoopBody(node.body, runtime);
      if (node.update) {
        const executions = executeStatement(node.update, runtime, node.line);
        executions.forEach((execution) => pushExecution(runtime, execution, node.update, node.line));
      }
    }
  }
}

function executeLoopBody(nodes, runtime) {
  runtime.loopDepth += 1;
  try {
    executeNodes(nodes, runtime);
  } finally {
    runtime.loopDepth -= 1;
  }
}

function withDeclarationRole(runtime, role, callback) {
  const previousRole = runtime.declarationRole;
  runtime.declarationRole = role;
  try {
    return callback();
  } finally {
    runtime.declarationRole = previousRole;
  }
}

function guardStep(runtime, line) {
  runtime.steps += 1;
  if (runtime.steps > MAX_EXECUTION_STEPS) {
    throw new Error(`第 ${line} 行附近循环次数过多，已停止执行。请检查是否出现死循环。`);
  }
}

function pushExecution(runtime, execution, code, line) {
  runtime.state = execution.state;
  pushFrame(runtime, { ...execution, code, line });
}

function pushFrame(runtime, frame) {
  if (runtime.frames.length >= MAX_RENDERED_FRAMES) {
    throw new Error(`演示步骤超过 ${MAX_RENDERED_FRAMES} 步，已停止。教学演示时建议缩小输入范围，或先讲解核心循环。`);
  }
  runtime.frames.push({
    state: cloneState(runtime.state),
    title: frame.title,
    line: frame.line,
    code: frame.code,
    event: frame.event,
  });
}

function executeStatement(statement, runtime, line) {
  const state = runtime.state;

  if (/^return\b/.test(statement)) {
    return [
      {
        state: cloneState(state),
        title: "遇到 return，结束当前演示语句",
        event: { type: "none" },
      },
    ];
  }

  const input = statement.match(/^cin\s*>>\s*([\s\S]+)$/);
  if (input) {
    return executeInput(input[1], runtime, line);
  }

  const output = statement.match(/^cout\s*<<\s*([\s\S]+)$/);
  if (output) {
    return [executeOutput(output[1], state, line)];
  }

  const declaration = statement.match(/^(?:long\s+long|long|int)\s+([\s\S]+)$/);
  if (declaration) {
    const role = runtime.declarationRole ?? (runtime.loopDepth > 0 ? "loop" : "standard");
    return executeDeclarations(declaration[1], state, line, role);
  }

  const swapCall = statement.match(/^(?:std::)?swap\s*\((.+),(.+)\)$/);
  if (swapCall) {
    return [executeSwap(swapCall[1], swapCall[2], state, line)];
  }

  const compound = statement.match(/^(.+?)\s*([+\-*/%])=\s*(.+)$/);
  if (compound) {
    return [executeCompoundAssignment(compound[1], compound[2], compound[3], state, line)];
  }

  const postfixIncrement = statement.match(/^(.+?)(\+\+|--)$/);
  if (postfixIncrement) {
    return [executeIncrement(postfixIncrement[1], postfixIncrement[2], state, line)];
  }

  const prefixIncrement = statement.match(/^(\+\+|--)(.+)$/);
  if (prefixIncrement) {
    return [executeIncrement(prefixIncrement[2], prefixIncrement[1], state, line)];
  }

  const assignment = statement.match(/^(.+?)\s*=\s*(.+)$/);
  if (assignment) {
    return [executeAssignment(assignment[1], assignment[2], state, line)];
  }

  throw new Error(`暂不支持：${statement}`);
}

function executeInput(text, runtime, line) {
  const targets = text.split(">>").map((part) => part.trim()).filter(Boolean);
  const executions = [];
  let state = runtime.state;

  targets.forEach((targetText) => {
    if (runtime.inputCursor >= runtime.inputValues.length) {
      throw new Error(`第 ${line} 行 cin 需要更多输入数据：${targetText}`);
    }
    const target = parseReference(targetText, state, line);
    const value = Number(runtime.inputValues[runtime.inputCursor]);
    if (!Number.isFinite(value)) {
      throw new Error(`输入数据不是数字：${runtime.inputValues[runtime.inputCursor]}`);
    }
    runtime.inputCursor += 1;
    const next = cloneState(state);
    setReferenceValue(target, next, value, line);
    executions.push({
      state: next,
      title: `第 ${line} 行：输入 ${target.label} = ${value}`,
      event: { type: "assign", source: null, sourceText: "cin", target: target.label, value },
    });
    state = next;
  });

  return executions;
}

function executeOutput(text, state, line) {
  const next = cloneState(state);
  const chunks = text.split("<<").map((part) => part.trim()).filter(Boolean);
  const output = chunks
    .map((chunk) => {
      if (chunk === "endl") return "\n";
      const stringMatch = chunk.match(/^"([\s\S]*)"$/);
      if (stringMatch) return stringMatch[1];
      return String(evaluateExpression(chunk, state, line));
    })
    .join("");
  next.output += output;
  return {
    state: next,
    title: `第 ${line} 行：输出 ${output || "换行"}`,
    event: { type: "output" },
  };
}

function executeDeclarations(text, state, line, role) {
  const items = splitComma(text);
  const executions = [];
  let current = state;

  items.forEach((item) => {
    const declaration = item.match(/^([A-Za-z_]\w*)\s*(?:\[\s*(.*?)\s*\])?\s*(?:=\s*(.+))?$/);
    if (!declaration) {
      throw new Error(`第 ${line} 行声明格式暂不支持：${item}`);
    }
    const execution = executeDeclaration(declaration, current, line, role);
    executions.push(execution);
    current = execution.state;
  });

  return executions;
}

function executeDeclaration(match, state, line, role) {
  const [, name, sizeExpression, initializer] = match;
  const next = cloneState(state);

  if (sizeExpression !== undefined) {
    const initialValues = initializer ? parseInitializer(initializer, state, line) : [];
    const size = sizeExpression.trim()
      ? toArraySize(evaluateExpression(sizeExpression, state, line), line)
      : initialValues.length;

    if (size <= 0) {
      throw new Error(`第 ${line} 行数组长度必须大于 0：${name}`);
    }
    if (!sizeExpression.trim() && initialValues.length === 0) {
      throw new Error(`第 ${line} 行省略数组长度时需要初始化列表：${name}`);
    }

    const values = Array.from({ length: size }, (_, index) => initialValues[index] ?? 0);
    if (initialValues.length > size) {
      throw new Error(`第 ${line} 行初始化值数量超过数组长度：${name}`);
    }
    upsertSymbol(next, { name, kind: "array", values, role });
    return {
      state: next,
      title: `第 ${line} 行：声明数组 ${name}`,
      event: {
        type: "create-array",
        targets: values.map((_, index) => `${name}[${index}]`),
        value: values.join(", "),
      },
    };
  }

  const value = initializer ? evaluateExpression(initializer, state, line) : 0;
  upsertSymbol(next, { name, kind: "scalar", value, role });
  return {
    state: next,
    title: `第 ${line} 行：声明变量 ${name} = ${value}`,
    event: { type: "create", target: name, value },
  };
}

function executeAssignment(leftSide, rightSide, state, line) {
  const target = parseReference(leftSide, state, line);
  const value = evaluateExpression(rightSide, state, line);
  const sourceRef = parseReferenceIfSimple(rightSide, state, line);
  const next = cloneState(state);
  setReferenceValue(target, next, value, line);
  return {
    state: next,
    title: `第 ${line} 行：${target.label} = ${value}`,
    event: {
      type: "assign",
      source: sourceRef?.label ?? null,
      sourceText: rightSide.trim(),
      target: target.label,
      value,
    },
  };
}

function executeCompoundAssignment(leftSide, operator, rightSide, state, line) {
  const target = parseReference(leftSide, state, line);
  const currentValue = getReferenceValue(target, state, line);
  const rightValue = evaluateExpression(rightSide, state, line);
  let value = currentValue;

  if (operator === "+") value += rightValue;
  if (operator === "-") value -= rightValue;
  if (operator === "*") value *= rightValue;
  if (operator === "/") {
    if (rightValue === 0) throw new Error(`第 ${line} 行不能除以 0`);
    value = Math.trunc(value / rightValue);
  }
  if (operator === "%") {
    if (rightValue === 0) throw new Error(`第 ${line} 行不能对 0 取模`);
    value %= rightValue;
  }

  const next = cloneState(state);
  setReferenceValue(target, next, value, line);
  return {
    state: next,
    title: `第 ${line} 行：${target.label} ${operator}= ${rightValue}，结果 ${value}`,
    event: {
      type: "assign",
      source: target.label,
      sourceText: rightSide.trim(),
      target: target.label,
      value,
    },
  };
}

function executeIncrement(targetText, operator, state, line) {
  const target = parseReference(targetText, state, line);
  const currentValue = getReferenceValue(target, state, line);
  const value = operator === "++" ? currentValue + 1 : currentValue - 1;
  const next = cloneState(state);
  setReferenceValue(target, next, value, line);
  return {
    state: next,
    title: `第 ${line} 行：${target.label}${operator}，结果 ${value}`,
    event: {
      type: "assign",
      source: target.label,
      sourceText: operator,
      target: target.label,
      value,
    },
  };
}

function executeSwap(firstText, secondText, state, line) {
  const first = parseReference(firstText, state, line);
  const second = parseReference(secondText, state, line);
  const firstValue = getReferenceValue(first, state, line);
  const secondValue = getReferenceValue(second, state, line);
  const next = cloneState(state);
  setReferenceValue(first, next, secondValue, line);
  setReferenceValue(second, next, firstValue, line);
  return {
    state: next,
    title: `第 ${line} 行：交换 ${first.label} 和 ${second.label}`,
    event: {
      type: "swap",
      tokens: [
        { source: first.label, target: second.label, value: firstValue },
        { source: second.label, target: first.label, value: secondValue },
      ],
      targets: [first.label, second.label],
    },
  };
}

function parseInitializer(text, state, line) {
  const trimmed = text.trim();
  if (!/^\{[\s\S]*\}$/.test(trimmed)) {
    throw new Error(`第 ${line} 行数组初始化需要使用 { ... }`);
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return splitComma(inner).map((part) => evaluateExpression(part, state, line));
}

function splitComma(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function createState() {
  return { symbols: [], output: "" };
}

function emptyFrame() {
  return {
    state: createState(),
    title: "等待运行",
    line: 0,
    code: "",
    event: { type: "none" },
  };
}

function cloneState(state) {
  return {
    symbols: state.symbols.map((symbol) =>
      symbol.kind === "array"
        ? { name: symbol.name, kind: "array", values: [...symbol.values], role: symbol.role ?? "standard" }
        : { name: symbol.name, kind: "scalar", value: symbol.value, role: symbol.role ?? "standard" },
    ),
    output: state.output ?? "",
  };
}

function findSymbol(state, name) {
  return state.symbols.find((symbol) => symbol.name === name);
}

function ensureNameAvailable(state, name, line) {
  if (findSymbol(state, name)) {
    throw new Error(`第 ${line} 行变量已存在：${name}`);
  }
}

function upsertSymbol(state, nextSymbol) {
  const index = state.symbols.findIndex((symbol) => symbol.name === nextSymbol.name);
  if (index >= 0) {
    state.symbols[index] = nextSymbol;
  } else {
    state.symbols.push(nextSymbol);
  }
}

function parseReference(text, state, line) {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Za-z_]\w*)\s*(?:\[\s*(.+)\s*\])?$/);
  if (!match) {
    throw new Error(`第 ${line} 行左侧必须是变量或数组元素：${trimmed}`);
  }
  const [, name, indexExpression] = match;
  const symbol = findSymbol(state, name);
  if (!symbol) {
    throw new Error(`第 ${line} 行未声明变量：${name}`);
  }
  if (indexExpression === undefined) {
    if (symbol.kind !== "scalar") {
      throw new Error(`第 ${line} 行数组需要指定下标：${name}`);
    }
    return { name, kind: "scalar", label: name };
  }

  if (symbol.kind !== "array") {
    throw new Error(`第 ${line} 行普通变量不能使用下标：${name}`);
  }
  const index = toArrayIndex(evaluateExpression(indexExpression, state, line), symbol.values.length, line, name);
  return { name, kind: "array", index, label: `${name}[${index}]` };
}

function parseReferenceIfSimple(text, state, line) {
  try {
    const trimmed = text.trim();
    if (!/^([A-Za-z_]\w*)(\s*\[[^\]]+\])?$/.test(trimmed)) return null;
    return parseReference(trimmed, state, line);
  } catch {
    return null;
  }
}

function getReferenceValue(reference, state, line) {
  const symbol = findSymbol(state, reference.name);
  if (!symbol) {
    throw new Error(`第 ${line} 行未声明变量：${reference.name}`);
  }
  if (reference.kind === "scalar") return symbol.value;
  return symbol.values[reference.index];
}

function setReferenceValue(reference, state, value, line) {
  const symbol = findSymbol(state, reference.name);
  if (!symbol) {
    throw new Error(`第 ${line} 行未声明变量：${reference.name}`);
  }
  if (reference.kind === "scalar") {
    symbol.value = value;
  } else {
    symbol.values[reference.index] = value;
  }
}

function toArraySize(value, line) {
  if (!Number.isInteger(value)) {
    throw new Error(`第 ${line} 行数组长度必须是整数`);
  }
  return value;
}

function toArrayIndex(value, length, line, name) {
  if (!Number.isInteger(value)) {
    throw new Error(`第 ${line} 行数组下标必须是整数：${name}[${value}]`);
  }
  if (value < 0 || value >= length) {
    throw new Error(`第 ${line} 行数组下标越界：${name}[${value}]`);
  }
  return value;
}

function evaluateExpression(expression, state, line) {
  const parser = new ExpressionParser(expression, state, line);
  const value = parser.parse();
  if (!Number.isFinite(value)) {
    throw new Error(`第 ${line} 行表达式结果无效：${expression}`);
  }
  return Object.is(value, -0) ? 0 : value;
}

class ExpressionParser {
  constructor(expression, state, line) {
    this.expression = expression;
    this.tokens = tokenize(expression, line);
    this.index = 0;
    this.state = state;
    this.line = line;
  }

  parse() {
    const value = this.parseEquality();
    if (!this.isAtEnd()) {
      throw new Error(`第 ${this.line} 行表达式无法解析：${this.expression}`);
    }
    return value;
  }

  parseEquality() {
    let value = this.parseComparison();
    while (this.match("==") || this.match("!=")) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      value = operator === "==" ? Number(value === right) : Number(value !== right);
    }
    return value;
  }

  parseComparison() {
    let value = this.parseAddSub();
    while (this.match("<") || this.match("<=") || this.match(">") || this.match(">=")) {
      const operator = this.previous().value;
      const right = this.parseAddSub();
      if (operator === "<") value = Number(value < right);
      if (operator === "<=") value = Number(value <= right);
      if (operator === ">") value = Number(value > right);
      if (operator === ">=") value = Number(value >= right);
    }
    return value;
  }

  parseAddSub() {
    let value = this.parseMulDiv();
    while (this.match("+") || this.match("-")) {
      const operator = this.previous().value;
      const right = this.parseMulDiv();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  parseMulDiv() {
    let value = this.parseUnary();
    while (this.match("*") || this.match("/") || this.match("%")) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error(`第 ${this.line} 行不能除以 0`);
      }
      if (operator === "*") value *= right;
      if (operator === "/") value = Math.trunc(value / right);
      if (operator === "%") value %= right;
    }
    return value;
  }

  parseUnary() {
    if (this.match("+")) return this.parseUnary();
    if (this.match("-")) return -this.parseUnary();
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.matchType("number")) return this.previous().value;

    if (this.matchType("identifier")) {
      const name = this.previous().value;
      const symbol = findSymbol(this.state, name);
      if (!symbol) {
        throw new Error(`第 ${this.line} 行未声明变量：${name}`);
      }
      if (this.match("[")) {
        if (symbol.kind !== "array") {
          throw new Error(`第 ${this.line} 行普通变量不能使用下标：${name}`);
        }
        const index = toArrayIndex(this.parseAddSub(), symbol.values.length, this.line, name);
        this.consume("]", `第 ${this.line} 行数组下标缺少 ]：${name}`);
        return symbol.values[index];
      }
      if (symbol.kind !== "scalar") {
        throw new Error(`第 ${this.line} 行数组需要指定下标：${name}`);
      }
      return symbol.value;
    }

    if (this.match("(")) {
      const value = this.parseEquality();
      this.consume(")", `第 ${this.line} 行表达式缺少 )`);
      return value;
    }

    throw new Error(`第 ${this.line} 行表达式无法解析：${this.expression}`);
  }

  match(value) {
    if (this.check(value)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  matchType(type) {
    if (this.checkType(type)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  consume(value, message) {
    if (this.match(value)) return;
    throw new Error(message);
  }

  check(value) {
    if (this.isAtEnd()) return false;
    return this.peek().value === value;
  }

  checkType(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  previous() {
    return this.tokens[this.index - 1];
  }

  peek() {
    return this.tokens[this.index];
  }

  isAtEnd() {
    return this.peek()?.type === "eof";
  }
}

function tokenize(expression, line) {
  const tokens = [];
  let cursor = 0;
  while (cursor < expression.length) {
    const char = expression[cursor];
    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }
    if (/\d/.test(char)) {
      let end = cursor + 1;
      while (end < expression.length && /\d/.test(expression[end])) end += 1;
      tokens.push({ type: "number", value: Number(expression.slice(cursor, end)) });
      cursor = end;
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let end = cursor + 1;
      while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end])) end += 1;
      tokens.push({ type: "identifier", value: expression.slice(cursor, end) });
      cursor = end;
      continue;
    }
    const twoChar = expression.slice(cursor, cursor + 2);
    if (["==", "!=", "<=", ">="].includes(twoChar)) {
      tokens.push({ type: "symbol", value: twoChar });
      cursor += 2;
      continue;
    }
    if ("+-*/%()[]<>".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      cursor += 1;
      continue;
    }
    throw new Error(`第 ${line} 行表达式包含暂不支持的字符：${char}`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function renderFrame(frame, pendingEvent = null) {
  stage.innerHTML = "";
  const symbols = frame.state.symbols;

  if (symbols.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>内存还是空的</strong><span>运行声明语句后，变量和数组会出现在这里。</span>";
    stage.append(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "memory-grid";
    symbols.forEach((symbol) => {
      grid.append(createMemoryBlock(symbol, pendingEvent));
    });
    stage.append(grid);
  }

  stepTitle.textContent = frame.title;
  stepCounter.textContent = `${currentIndex} / ${Math.max(frames.length - 1, 0)}`;
  currentCode.textContent = frame.code || "等待运行";
  outputBox.textContent = frame.state.output ?? "";
  renderMemoryOverview(symbols);
  renderTimeline();
}

function renderMemoryOverview(symbols) {
  const counts = symbols.reduce(
    (total, symbol) => {
      if (symbol.kind === "array") total.arrays += 1;
      if (symbol.kind === "scalar") total.scalars += 1;
      if (symbol.role === "iterator") total.iterators += 1;
      if (symbol.role === "loop") total.loopLocals += 1;
      return total;
    },
    { scalars: 0, arrays: 0, iterators: 0, loopLocals: 0 },
  );

  memoryOverview.innerHTML = "";
  [
    ["变量", counts.scalars, "overview-chip scalar-chip"],
    ["数组", counts.arrays, "overview-chip array-chip"],
    ["迭代器", counts.iterators, "overview-chip iterator-chip"],
    ["循环内", counts.loopLocals, "overview-chip loop-chip"],
  ].forEach(([label, value, className]) => {
    const chip = document.createElement("span");
    chip.className = className;
    chip.innerHTML = `<strong>${value}</strong>${label}`;
    memoryOverview.append(chip);
  });
}

function createMemoryBlock(symbol, pendingEvent) {
  const block = document.createElement("article");
  block.className = `memory-block ${symbol.kind === "array" ? "array-block" : "scalar-block"} ${getSymbolRoleClass(symbol)}`;

  const title = document.createElement("div");
  title.className = "block-title";
  title.innerHTML = `
    <strong>${escapeHtml(symbol.name)}</strong>
    <span class="pill-group">
      ${getSymbolRolePill(symbol)}
      <span class="type-pill">${symbol.kind === "array" ? "int[]" : "int"}</span>
    </span>
  `;
  block.append(title);

  if (symbol.kind === "scalar") {
    const body = document.createElement("div");
    body.className = "scalar-body";
    body.append(createCell(symbol.name, symbol.value, pendingEvent, symbol.role));
    block.append(body);
    return block;
  }

  const body = document.createElement("div");
  body.className = "array-body";
  symbol.values.forEach((value, index) => {
    body.append(createCell(`${symbol.name}[${index}]`, value, pendingEvent, symbol.role));
  });
  block.append(body);
  return block;
}

function createCell(label, value, pendingEvent, role = "standard") {
  const cell = document.createElement("div");
  cell.className = `cell ${getSymbolRoleClass({ role })}`;
  cell.dataset.ref = label;
  if (isEventSource(label, pendingEvent)) cell.classList.add("source");
  if (isEventTarget(label, pendingEvent)) cell.classList.add("changed");

  const name = document.createElement("span");
  name.className = "cell-label";
  name.textContent = label;

  const cellValue = document.createElement("strong");
  cellValue.className = "cell-value";
  cellValue.textContent = String(value);

  cell.append(name, cellValue);
  return cell;
}

function getSymbolRoleClass(symbol) {
  if (symbol.role === "iterator") return "iterator-symbol";
  if (symbol.role === "loop") return "loop-symbol";
  return "";
}

function getSymbolRolePill(symbol) {
  if (symbol.role === "iterator") return '<span class="role-pill iterator-pill">迭代器</span>';
  if (symbol.role === "loop") return '<span class="role-pill loop-pill">循环内</span>';
  return "";
}

function isEventSource(label, event) {
  if (!event) return false;
  if (event.source === label) return true;
  return event.tokens?.some((token) => token.source === label) ?? false;
}

function isEventTarget(label, event) {
  if (!event) return false;
  if (event.target === label) return true;
  if (event.targets?.includes(label)) return true;
  return event.tokens?.some((token) => token.target === label) ?? false;
}

async function animateEvent(previousFrame, nextFrame) {
  const event = nextFrame.event;
  const duration = Number(speedInput.value);

  if (event.type === "assign") {
    await moveToken({
      source: event.source,
      target: event.target,
      value: event.value,
      duration,
      fallbackText: event.sourceText,
    });
    return;
  }

  if (event.type === "swap") {
    await Promise.all(
      event.tokens.map((token, index) =>
        moveToken({
          source: token.source,
          target: token.target,
          value: token.value,
          duration,
          alternate: index === 1,
        }),
      ),
    );
    return;
  }

  if (event.type === "create" || event.type === "create-array") {
    await sleep(Math.min(duration, 520));
  }
}

function moveToken({ source, target, value, duration, fallbackText = "expr", alternate = false }) {
  const targetRect = getCellRect(target);
  if (!targetRect) return sleep(Math.min(duration, 420));

  const sourceRect = source ? getCellRect(source) : null;
  const start = sourceRect
    ? centerOf(sourceRect)
    : { x: Math.max(92, targetRect.left - 90), y: Math.max(86, targetRect.top - 64) };
  const end = centerOf(targetRect);

  const token = document.createElement("div");
  token.className = `moving-token${alternate ? " alt" : ""}`;
  token.textContent = String(value);
  token.title = source ? `${source} -> ${target}` : `${fallbackText} -> ${target}`;
  document.body.append(token);

  token.style.left = `${start.x}px`;
  token.style.top = `${start.y}px`;

  const curve = Math.max(34, Math.min(88, Math.abs(end.x - start.x) * 0.12 + 34));
  const animation = token.animate(
    [
      { left: `${start.x}px`, top: `${start.y}px`, transform: "translate(-50%, -50%) scale(0.92)" },
      {
        left: `${(start.x + end.x) / 2}px`,
        top: `${Math.min(start.y, end.y) - curve}px`,
        transform: "translate(-50%, -50%) scale(1.08)",
      },
      { left: `${end.x}px`, top: `${end.y}px`, transform: "translate(-50%, -50%) scale(0.96)" },
    ],
    {
      duration,
      easing: "cubic-bezier(.2,.75,.18,1)",
      fill: "forwards",
    },
  );

  return animation.finished
    .catch(() => {})
    .then(() => {
      token.remove();
    });
}

function getCellRect(label) {
  const cell = stage.querySelector(`[data-ref="${cssEscape(label)}"]`);
  return cell?.getBoundingClientRect() ?? null;
}

function centerOf(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function renderTimeline() {
  timeline.innerHTML = "";
  const indexes = getTimelineIndexes(frames.length, currentIndex);

  indexes.forEach((index, position) => {
    if (position > 0 && index - indexes[position - 1] > 1) {
      const gap = document.createElement("span");
      gap.className = "timeline-gap";
      gap.textContent = "...";
      timeline.append(gap);
    }

    const frame = frames[index];
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.step = String(index);
    button.textContent = String(index);
    button.title = frame.title;
    if (index === currentIndex) button.classList.add("active");
    timeline.append(button);
  });
}

function getTimelineIndexes(total, current) {
  if (total <= 260) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const indexes = new Set([0, total - 1]);
  const stride = Math.ceil(total / 120);
  for (let index = 0; index < total; index += stride) {
    indexes.add(index);
  }
  for (let index = current - 5; index <= current + 5; index += 1) {
    if (index >= 0 && index < total) indexes.add(index);
  }
  return [...indexes].sort((a, b) => a - b);
}

function setControls() {
  const hasSteps = frames.length > 1;
  backButton.disabled = !hasSteps || currentIndex <= 0 || animating;
  nextButton.disabled = !hasSteps || currentIndex >= frames.length - 1 || animating;
  playButton.disabled = !hasSteps || animating;
  resetButton.disabled = !hasSteps && currentIndex === 0;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}
