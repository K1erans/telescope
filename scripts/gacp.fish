function gacp --description "git add, commit, and push"
    if test (count $argv) -lt 1
        echo "Usage: gacp \"commit message\"" >&2
        return 1
    end

    if not git rev-parse --is-inside-work-tree >/dev/null 2>&1
        echo "gacp: not inside a git repository" >&2
        return 1
    end

    set -l message (string join ' ' $argv)

    git add -A
    and git commit -m "$message"
    and git push
end
