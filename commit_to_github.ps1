# Commit the changes to GitHub

# Make sure you have initialized Git repository and added remote
# Run these commands manually first if you haven't:
# git init
# git remote add origin https://github.com/kengtableg/KengtableG.git

# Add all files except those in .gitignore
git add .

# Commit the changes
git commit -m "Cleaned up codebase: removed personal information, fixed imports, and removed unused debug code"

# Push to GitHub (uncomment the appropriate line)
# For main branch
# git push -u origin main

# For master branch
# git push -u origin master

# Show status
git status

Write-Host "Changes committed successfully. Please push to GitHub when ready." 