# EAS Update Consistency Checklist

1. ✅ Check for uncommitted changes:
	```sh
	git status
	```
2. ✅ Review recent commit history:
	```sh
	git log -5 --oneline
	```
3. ✅ Commit and push all changes:
	```sh
	git add .
	git commit -m "<your commit message>"
	git push
	```
4. ✅ Confirm the current branch:
	```sh
	git branch
	```
5. ✅ Ensure manual edits are included in the commit (repeat step 1 if needed).
6. ✅ Run EAS Update:
	```sh
	eas update
	```

**Follow this workflow after every change to maintain deployment consistency and prevent issues with EAS Update.**
