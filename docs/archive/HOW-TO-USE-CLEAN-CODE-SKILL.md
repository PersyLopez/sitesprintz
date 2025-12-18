# How to Use the Clean Code QA Agent Skill

## Quick Reference

To tell an agent to use the Clean Code QA skill, use one of these methods:

### Method 1: Direct File Reference (Recommended)

```
Please analyze this code using the Clean Code QA Agent skill: @docs/archive/CLEAN-CODE-QA-AGENT-SKILL.md

[Paste your code here]
```

Or simply:

```
Use @CLEAN-CODE-QA-AGENT-SKILL.md to review this code:

[Your code]
```

### Method 2: Explicit Instruction

```
Act as the Clean Code Quality Assurance Agent. Review the following code against the Clean Code principles and provide a detailed analysis with violations and refactoring suggestions.

[Your code]
```

### Method 3: Specific Analysis Request

```
I need a code quality review. Please:
1. Read @CLEAN-CODE-QA-AGENT-SKILL.md
2. Analyze the code in [file path]
3. Follow the Quick Start workflow
4. Provide violations with refactoring suggestions

[Your code or file path]
```

---

## Example Prompts

### Example 1: Analyze a Single File

```
Use the Clean Code QA skill (@CLEAN-CODE-QA-AGENT-SKILL.md) to analyze server/services/orderProcessor.js

Provide:
- All violations found
- Priority levels (HIGH/MEDIUM/LOW)
- Specific refactoring suggestions
- Summary with counts
```

### Example 2: Analyze Multiple Files

```
Act as the Clean Code QA Agent. Review these files using @CLEAN-CODE-QA-AGENT-SKILL.md:

- src/utils/validation.js
- src/services/payment.js
- src/models/order.js

Prioritize violations and suggest a refactoring sequence.
```

### Example 3: Focus on Specific Principles

```
Using @CLEAN-CODE-QA-AGENT-SKILL.md, analyze this code focusing on:
- Single Responsibility Principle violations
- Long functions
- Meaningful naming

[Your code]
```

### Example 4: Pre-commit Review

```
Before committing, use @CLEAN-CODE-QA-AGENT-SKILL.md to review the changes in:
- server/api/routes.js
- server/middleware/auth.js

Only flag HIGH and MEDIUM priority violations.
```

---

## What the Agent Will Do

When you reference the skill, the agent will:

1. ✅ Read the skill file to understand the framework
2. ✅ Follow the Quick Start workflow
3. ✅ Apply the Analysis Framework checklists
4. ✅ Identify code smells using Diagnostic Capabilities
5. ✅ Document violations with:
   - Snippet (code reference format)
   - Violation type and priority
   - Principle broken
   - Refactoring suggestion
   - Suggested technique from Execution Tactics
6. ✅ Provide a summary with priority breakdown
7. ✅ If code is clean, state "This code adheres to the Boy Scout Rule"

---

## Tips for Best Results

### ✅ Good Prompts

- **Be specific**: "Analyze `server.js` using @CLEAN-CODE-QA-AGENT-SKILL.md"
- **Include context**: "Review the payment processing code for Clean Code violations"
- **Set scope**: "Focus on functions > 50 lines and SRP violations"
- **Request format**: "Provide violations in the structured output format"

### ❌ Less Effective Prompts

- "Check my code" (too vague)
- "Is this clean?" (doesn't use the framework)
- "Fix everything" (should focus on analysis first)

---

## Integration with Other Workflows

### Code Review Workflow

```
1. Use @CLEAN-CODE-QA-AGENT-SKILL.md to analyze the PR changes
2. Create issues for HIGH priority violations
3. Address MEDIUM priority in follow-up PR
4. LOW priority can be handled during refactoring sprints
```

### Refactoring Workflow

```
1. Use @CLEAN-CODE-QA-AGENT-SKILL.md to identify violations
2. Use the Decision Tree to select refactoring techniques
3. Apply refactorings in priority order (HIGH → MEDIUM → LOW)
4. Run tests after each refactoring step
5. Re-analyze to verify improvements
```

### Onboarding Workflow

```
1. New developer reviews @CLEAN-CODE-QA-AGENT-SKILL.md
2. Agent analyzes their first PR using the skill
3. Provides educational feedback on violations
4. Helps them understand Clean Code principles
```

---

## File Location

The skill file is located at:
```
docs/archive/CLEAN-CODE-QA-AGENT-SKILL.md
```

You can reference it as:
- `@CLEAN-CODE-QA-AGENT-SKILL.md`
- `@docs/archive/CLEAN-CODE-QA-AGENT-SKILL.md`
- `docs/archive/CLEAN-CODE-QA-AGENT-SKILL.md`

---

## Quick Command Reference

```bash
# In Cursor/VS Code with AI:
@CLEAN-CODE-QA-AGENT-SKILL.md analyze [file]

# In chat:
"Use @CLEAN-CODE-QA-AGENT-SKILL.md to review [file]"

# For specific focus:
"Using @CLEAN-CODE-QA-AGENT-SKILL.md, check [file] for SRP violations and long functions"
```



