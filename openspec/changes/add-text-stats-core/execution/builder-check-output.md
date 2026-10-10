Ranked questions that remain unresolved and would significantly impact the design or correctness of the implementation — specifically, where a wrong guess would lead to incorrect behavior, missed edge cases, or flawed performance.

---

### 1. **How should "repeated punctuation" be interpreted in the sentence count?**  
**Why it matters:** The scenario "Wait... really?! ..." is specified to return a sentence count of 2. But the current design splits on `[.!?]+` and counts parts that contain a word. This implies that multiple punctuation marks in a row are treated as one sentence-ending delimiter. However, the behavior of *how* the split works (e.g., whether it collapses multiple marks into one, or treats each as a separate boundary) is not explicitly defined.  

If the split is done naively (e.g., `split(/[.!?]+/)`), then `"Wait... really?! ..."` becomes `["Wait", "really", ""]`, and only the first two parts have words — so it would count 2 sentences. That matches the spec. But if the split is done with a greedy or non-greedy pattern, or if the empty string after punctuation is not filtered properly, it could miscount.  

**Risk:** A wrong interpretation could lead to incorrect sentence counts in real-world text with repeated punctuation. For example, if the system treats `...` as three separate sentence endings, it might incorrectly count more than two sentences.  

**Impact:** This directly affects correctness of the `sentenceCount` function and must be explicitly defined in the design.  

> ✅ **Importance: High** — A wrong answer here would break the spec.

---

### 2. **What constitutes a "word" in the Unicode case (e.g., "café", "日本")?**  
**Why it matters:** The design states that words are runs of characters matching `/[\p{L}\p{N}]/u`. This is correct for Unicode, but the *behavior* of this regex in practice — especially with combining characters (like "café" with the accent) — is not fully clarified.  

For example:  
- Is "café" one word? Yes — it matches `\p{L}`.  
- Is "caféé" (with double accent) still one word? The regex will still match it as one run.  

But what about a case like `"café - world"`? Does the hyphen break it? The current design uses `\s+` split, so hyphens are not part of the word boundary. But if the text is `"café-é"`, is that one word or two?  

The spec says "a run of characters that contains at least one letter or digit", so "café-é" would be one word if the entire run is matched. But if the hyphen is treated as a separator, it might be split.  

**Risk:** The current design assumes that only whitespace and punctuation are split, but if the input contains non-whitespace separators (like hyphens, dashes, or em-dashes), the word count could be miscounted.  

**Impact:** This affects `wordCount` correctness in real-world text. Without clarification, the implementation may fail on edge cases like `"café-é"` or `"日本-文化"`.  

> ✅ **Importance: High** — A wrong assumption could lead to incorrect word counts in multilingual or complex text.

---

### 3. **Does the sentence count include trailing text with no terminal punctuation?**  
**Why it matters:** The spec says: *"plus one for trailing text with at least one word and no terminal punctuation."* This is critical.  

The current design says: "count parts that contain a word" after splitting on `[.!?]+`. But if the text ends with a word (e.g., `"Hello. world"`), and there's no punctuation after, the trailing part is not captured.  

However, the spec explicitly says to *add one* for trailing text with a word and no terminal punctuation. This implies that the sentence count should be:  
- One per sentence-ending punctuation (`.!?`)  
- Plus one for the final segment if it has a word and no punctuation  

But the current implementation only counts parts that contain a word — which would *exclude* the trailing segment if it's not followed by punctuation.  

**Risk:** The current design may miss the trailing sentence. For example, `"One. two words"` — the trailing "two words" is not followed by punctuation, so it should be counted as a sentence, but if the split only captures parts with words and the trailing part is not captured, it will be missed.  

**Impact:** This directly contradicts the spec. Without clarification, the implementation may undercount sentences.  

> ✅ **Importance: High** — This is a fundamental misalignment with the spec.

---

### 4. **What happens when a sentence ends with a word and punctuation, but the punctuation is not a terminal mark (e.g., "Hello, world!")?**  
**Why it matters:** The spec says "ends in one or more of '.', '!', or '?'". So only those three are valid. But what about a sentence ending with a comma?  

The current design splits on `[.!?]+`, so a comma is not a delimiter. That means `"Hello, world"` would be split into `["Hello", "world"]` — but the second part has no punctuation, so it would be treated as a sentence only if it ends with punctuation.  

But the spec does not say that commas are valid sentence endings. So `"Hello, world"` should not be counted as a sentence ending.  

**Risk:** The current design may incorrectly treat a comma as a sentence boundary, or fail to recognize a sentence ending at all.  

**Impact:** This affects correctness in real-world text. Without clarification, the system may miscount sentences in common usage.  

> ✅ **Importance: Medium** — Less critical than the trailing text issue, but still a potential error.

---

### Final Ranking (by importance):

1. ✅ **Does the sentence count include trailing text with no terminal punctuation?**  
   → *Critical spec violation; current design fails to match the spec.*

2. ✅ **How is repeated punctuation handled in sentence counting?**  
   → *Directly affects correctness in edge cases; current split logic may not match the expected behavior.*

3. ✅ **What constitutes a "word" in Unicode text with non-whitespace separators (e.g., hyphens, em-dashes)?**  
   → *Affects real-world correctness in multilingual or complex text; current split may miscount.*

4. ✅ **Are commas or other punctuation valid sentence endings?**  
   → *Affects edge case handling; but less critical than the trailing text issue.*

---

> ✅ **Final Answer:**  
> 1. Does the sentence count include trailing text with no terminal punctuation?  
>    → The current design fails to account for this, which contradicts the spec.  
> 2. How is repeated punctuation (e.g., "...", "?!") handled in sentence counting?  
>    → The current split logic
ollama runner: answer hit OLLAMA_NUM_PREDICT and was cut off

<!-- ollama: qwen3:4b-instruct, prompt 1223 tokens, output 1500 tokens (cut at num_predict), 194.0s wall -->
