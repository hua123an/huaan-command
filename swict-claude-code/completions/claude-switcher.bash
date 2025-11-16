#!/bin/bash
# Bash completion for claude-switcher

_claude_switcher_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  commands="add list switch remove show update edit validate test verify repair backup interactive health audit log help version"
  providers=""

  # Get list of configured providers
  if [ -f ~/.claude/model-switcher.json ]; then
    providers=$(grep -o '"name"[^,]*' ~/.claude/model-switcher.json | cut -d'"' -f4 | tr '\n' ' ')
  fi

  case "${prev}" in
    claude-switcher|ccs)
      COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
      return 0
      ;;
    switch|remove|show|validate|test|verify|repair)
      COMPREPLY=( $(compgen -W "${providers}" -- ${cur}) )
      return 0
      ;;
    -h|--help|-v|--version)
      COMPREPLY=()
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "${commands} ${providers}" -- ${cur}) )
}

complete -F _claude_switcher_completion claude-switcher
complete -F _claude_switcher_completion ccs
complete -F _claude_switcher_completion ccs-select
