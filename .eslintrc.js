module.exports = {
	"env": {
		"browser": true,
		"es2021": true
	},
	"overrides": [
		{
			"env": {
				"node": true
			},
			"files": [
				".eslintrc.{js,cjs}"
			],
			"parserOptions": {
				"sourceType": "script"
			}
		}
	],
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"ecmaVersion": "latest"
	},
	"plugins": [
		"@typescript-eslint"
	],
	"rules": {
		semi: [2, "never"],
		indent: [2, "tab"],
		quotes: [2, "double"],
		"object-curly-spacing": ["error", "never"],
		"no-multiple-empty-lines": ["error", {"max": 2, "maxBOF": 0, "maxEOF": 1}]
	}
}
