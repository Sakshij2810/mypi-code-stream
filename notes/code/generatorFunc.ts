/*          
        1. What is a Generator Function? -> A generator function is a special type of JavaScript function that can pause its execution and resume it later.

        2. What is yield? -> yield is a keyword used inside generator functions.
        
                            Its primary purpose is to:

                            1. Return a value from the generator.
                            2. Pause the generator's execution.
                            3. Allow execution to resume later through .next().

*/

function* generateNumber() {
  console.log("Started...");
  yield 1;

  console.log("Resumed...");
  yield 2;

  console.log("Finished...");

  return 3;
}

const generator = generateNumber();

console.log(generator.next()); // Started...  { value: 1, done: false }
console.log(generator.next()); // Resumed...  { value: 2, done: false }
console.log(generator.next()); // Finished... { value: 3, done: true }
console.log(generator.next()); // { value: undefined, done: true }

function* fruits() {
  yield "Apple";
  yield "Banana";
  yield "Orange";
  yield "Mango";
}

const iterator = fruits();

console.log(iterator.next()); // { value: "Apple", done: false }
console.log(iterator.next()); // { value: "Banana", done: false }
console.log(iterator.next()); // { value: "Orange", done: false }
console.log(iterator.next()); // { value: "Mango", done: false }
console.log(iterator.next()); // { value: undefined, done: true }
