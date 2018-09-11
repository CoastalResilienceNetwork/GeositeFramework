GeositeFramework
================
A configurable ASP.NET and Javascript framework for hosting map tool plugins.  Developed to support the [Coastal Resilience](http://coastalresilience.org/) suite of [tools](http://maps.coastalresilience.org/network/).  

Coastal Resilience is a program of The Nature Conservancy that supports a community of practitioners around the world who are applying planning innovations, the web-based mapping tool framework and individual Coastal Resilience “apps” or plugins to the framework to coastal hazards and adaptation issues. 

Copyright (C) 2013 The Nature Conservancy


## Static Site Conversion (**work in progress**)
This project is actively being converted into a static site and away from using .NET on the `feature/task-1` branch. During this time, the project will continue to work off `develop` via the typical set up in Visual Studio on Windows. It may break with Visual Studio on `feature/task-1` and its child branches.

### Run a python development environment
To run the project locally, on any OS, clone the repo and run `./scripts/server` from root. 

#### Ports

| Service            | Port                              |
| ------------------ | --------------------------------- |
| Python Dev Server  | [`54633`](http://localhost:54633) |

#### Scripts

| Name           | Description                                                   |
| -------------- | ------------------------------------------------------------- |
| `server`       | Run a Python SimpleHTTPServer              |