export type LabStep = {
  id: string
  order: number
  title: string
  content: string
  hint: string | null
  starterCode: string | null
}

export type Lab = {
  id: string
  title: string
  language: "python" | "php" | "typescript"
  category: string
  difficulty: "guided" | "intermediate" | "advanced"
  steps: LabStep[]
}

// UI-first mock data — backend wiring replaces this later, so consumers only
// depend on the Lab shape, never on the source of the payload.
export const mockLabs: Lab[] = [
  {
    id: "test123",
    title: "Intro to Python Lists",
    language: "python",
    category: "Data Literacy",
    difficulty: "guided",
    steps: [
      {
        id: "create-list",
        order: 1,
        title: "Create your first list",
        content:
          "A list is Python's way of storing multiple values in a single variable. Values are wrapped in square brackets and separated by commas.\n\nStart by building a list of the daily visitor counts:\n\nvisitor_counts = [120, 340, 275, 410, 95]\n\nThen print it to confirm it was created.",
        hint: "Remember: square brackets, commas between values, and you can print the whole list in one go.",
        starterCode: `# Step 1: Build your first list
visitor_counts = [120, 340, 275, 410, 95]

# TODO: print the list
`,
      },
      {
        id: "index-and-slice",
        order: 2,
        title: "Index and slice the list",
        content:
          "Items are 0-indexed, so visitor_counts[0] is the first element. Use a colon to take a slice: [1:3] returns the second and third items.\n\nPrint visitor_counts[0] and visitor_counts[1:3] and compare the outputs.",
        hint: "A slice's start is inclusive but its end is exclusive — [1:3] grabs indexes 1 and 2 only.",
        starterCode: `# Step 2: Index and slice the list
visitor_counts = [120, 340, 275, 410, 95]

# TODO: print visitor_counts[0] and visitor_counts[1:3]
`,
      },
      {
        id: "replace-elements",
        order: 3,
        title: "Replace an element",
        content:
          "Lists are mutable: you can overwrite a position by assigning a new value to its index.\n\nUpdate the second visitor count to 500, then print the list again to see the change.",
        hint: "Assign to an index just like a variable: visitor_counts[1] = 500.",
        starterCode: `# Step 3: Replace an element
visitor_counts = [120, 340, 275, 410, 95]

# TODO: update the second count to 500 and print
`,
      },
      {
        id: "loop-over-list",
        order: 4,
        title: "Loop over the list",
        content:
          "The for loop visits every element in order. Inside the body, the loop variable holds the current value on each pass.\n\nWrite a loop that prints each visitor count and doubles it at the same time.",
        hint: null,
        starterCode: `# Step 4: Loop over the list
visitor_counts = [120, 340, 275, 410, 95]

# TODO: print each count and double it
`,
      },
      {
        id: "find-max",
        order: 5,
        title: "Find the busiest day",
        content:
          "The max() builtin returns the largest value in a list. Compare it against a hand-written loop that tracks the highest number seen so far.\n\nPrint max(visitor_counts) and the result of your manual scan — they should match.",
        hint: "Start your running maximum with the first element, then compare each following element against it.",
        starterCode: `# Step 5: Find the busiest day
visitor_counts = [120, 340, 275, 410, 95]

# TODO: print max(visitor_counts) and your manual scan
`,
      },
    ],
  },
]
