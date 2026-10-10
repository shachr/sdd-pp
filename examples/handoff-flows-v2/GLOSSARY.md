# textkit

Small, dependency-free text utilities for Node callers (slugs, wrapping).

## Language

**Width**:
The maximum number of characters allowed on one output line.
_Avoid_: column, limit, max length

**Word**:
A run of non-space characters in the input; the unit that wrapping never breaks unless it is wider than the Width.
_Avoid_: token, term

**Paragraph**:
A part of the input between two line breaks; each Paragraph is wrapped on its own.
_Avoid_: block, section

**Line**:
One string in the result of wrapping, at most Width characters long.
_Avoid_: row
