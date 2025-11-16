#!/bin/bash

# 修复Vue文件中的属性换行问题
# Pattern: <element attribute="value" :key="something" -> 需要在某些属性前换行

find src -name "*.vue" -type f | while read file; do
  # 修复长行中的多个属性
  sed -i '' -E 's/(\s+)(v-for="[^"]+"\s+):key=/\1v-for="\2"\n\1  :key=/g' "$file"
  sed -i '' -E 's/(\s+):key="[^"]+"\s+:checked=/\1:key=""\n\1  :checked=/g' "$file"
  sed -i '' -E 's/(\s+)(class="[^"]*"\s+):title=/\1class=""\n\1  :title=/g' "$file"
  sed -i '' -E 's/(\s+)(type="[^"]*"\s+):placeholder=/\1type=""\n\1  :placeholder=/g' "$file"
  sed -i '' -E 's/(\s+):placeholder="[^"]*"\s+:disabled=/\1:placeholder=""\n\1  :disabled=/g' "$file"
done

echo "Format fixes applied"
