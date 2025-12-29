#!/usr/bin/env python3
import re

def fix_git_panel():
    """Fix GitPanel.vue template issues"""
    with open('src/components/GitPanel.vue', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix tab buttons
    content = re.sub(
        r'<button v-for="tab in \[\'status\', \'branches\', \'commits\', \'settings\'\]" :key="tab"\s+:class=',
        '''<button
                    v-for="tab in ['status', 'branches', 'commits', 'settings']"
                    :key="tab"
                    :class=''',
        content
    )
    
    # Fix branch loop
    content = re.sub(
        r'<div v-for="branch in branches" :key="branch\.name"\s+:class="\[\'branch-item\'',
        '''<div
                        v-for="branch in branches"
                        :key="branch.name"
                        :class="['branch-item''',
        content
    )
    
    # Fix textarea
    content = re.sub(
        r'<textarea\s*\nv-model="commitMessage" placeholder="Enter commit message\.\.\." class="commit-textarea"\s+@keydown',
        '''<textarea
                    v-model="commitMessage"
                    placeholder="Enter commit message..."
                    class="commit-textarea"
                    @keydown''',
        content
    )
    
    with open('src/components/GitPanel.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Fixed GitPanel.vue")

def fix_git_visualization():
    """Fix GitVisualization.vue template issues"""
    with open('src/components/GitVisualization.vue', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix button loop
    content = re.sub(
        r'<button v-for="tab in \[\'history\', \'stats\', \'contributors\', \'timeline\'\]" :key="tab"\s+:class=',
        '''<button
                v-for="tab in ['history', 'stats', 'contributors', 'timeline']"
                :key="tab"
                :class=''',
        content
    )
    
    # Fix branch tree
    content = re.sub(
        r'<div v-for="\(branch, idx\) in renderBranchTree\(branchTree\)" :key="idx" class="branch-node"\s+:style=',
        '''<div
                        v-for="(branch, idx) in renderBranchTree(branchTree)"
                        :key="idx"
                        class="branch-node"
                        :style=''',
        content
    )
    
    # Fix file-bar
    content = re.sub(
        r'<div class="file-bar"\s+:style="{ width:',
        '''<div
                                class="file-bar"
                                :style="{ width:''',
        content
    )
    
    # Fix contributor-bar
    content = re.sub(
        r'<div class="contributor-bar"\s+:style="{ width:',
        '''<div
                                class="contributor-bar"
                                :style="{ width:''',
        content
    )
    
    # Fix timeline
    content = re.sub(
        r'<div v-for="\(day, idx\) in gitStats\.commitsPerDay" :key="idx" class="timeline-day"\s+:title=',
        '''<div
                        v-for="(day, idx) in gitStats.commitsPerDay"
                        :key="idx"
                        class="timeline-day"
                        :title=''',
        content
    )
    
    with open('src/components/GitVisualization.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Fixed GitVisualization.vue")

def fix_commit_graph():
    """Fix CommitGraph.vue template issues"""
    with open('src/components/CommitGraph.vue', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix commit div
    content = re.sub(
        r'<div v-for="commit in filteredCommits" :key="commit\.id"\s+:class="\[\'commit-item\'',
        '''<div
                v-for="commit in filteredCommits"
                :key="commit.id"
                :class="['commit-item''',
        content
    )
    
    # Fix checkbox
    content = re.sub(
        r'<input type="checkbox" :checked="selectedCommits\.has\(commit\.id\)"\s+@change=',
        '''<input
                        type="checkbox"
                        :checked="selectedCommits.has(commit.id)"
                        @change=''',
        content
    )
    
    with open('src/components/CommitGraph.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Fixed CommitGraph.vue")

def fix_git_dashboard():
    """Fix GitDashboard.vue template issues"""
    with open('src/components/GitDashboard.vue', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix button loop
    content = re.sub(
        r'<button v-for="option in viewOptions" :key="option\.id"\s+:class="\[\'view-btn\'',
        '''<button
                v-for="option in viewOptions"
                :key="option.id"
                :class="['view-btn''',
        content
    )
    
    # Fix GitPanel
    content = re.sub(
        r'<GitPanel v-show="activeView === \'panel\'" :current-dir="currentDir" :session-id="sessionId"\s+class="view-container"',
        '''<GitPanel
                v-show="activeView === 'panel'"
                :current-dir="currentDir"
                :session-id="sessionId"
                class="view-container"''',
        content
    )
    
    # Fix GitVisualization
    content = re.sub(
        r'<GitVisualization v-show="activeView === \'visualization\'" :current-dir="currentDir"\s+class="view-container"',
        '''<GitVisualization
                v-show="activeView === 'visualization'"
                :current-dir="currentDir"
                class="view-container"''',
        content
    )
    
    with open('src/components/GitDashboard.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Fixed GitDashboard.vue")

if __name__ == '__main__':
    fix_git_panel()
    fix_git_visualization()
    fix_commit_graph()
    fix_git_dashboard()
    print("\n✅ All Vue template issues fixed!")
