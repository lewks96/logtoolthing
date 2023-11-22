## Log filter tool thing

config json sample for am
```json 
{
    "files": [
        {
            "filename": "scripts.AUTHENTICATION_TREE_DECISION_NODE.01e1a3c0-038b-4c16-956a-6c9d89328cff",
            "friendlyName": "Some slow script",
            "scriptType": "AM2",
            "startString": "Start Some Script",
            "keywords": [
                {
                    "searchString": "Some Line that we dont",
                    "symbol": "Before API call"
                },
                {
                    "string": "After some expensive api call",
                    "symbol": "After API call"
                }
            ]
        },
        {
            "filename": "scripts.AUTHENTICATION_TREE_DECISION_NODE.01e1a3c0-038b-4c16-956a-6c9d89328cff",
            "friendlyName": "Some other slow script",
            "scriptType": "AM2",
            "startString": "Start Some Script",
            "keywords": [
                {
                    "searchString": "Some Line that we dont",
                    "symbol": "Before API call"
                },
                {
                    "searchString": "After some expensive api call",
                    "symbol": "After API call"
                }
            ]
        }
    ]
}
```

complie + run
```bash
    tsc
    node logtool.js source\ files/files.json
```
