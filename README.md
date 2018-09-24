GeositeFramework
================
A configurable ASP.NET and Javascript framework for hosting map tool plugins.  Developed to support the [Coastal Resilience](http://coastalresilience.org/) suite of [tools](http://maps.coastalresilience.org/network/).  

Coastal Resilience is a program of The Nature Conservancy that supports a community of practitioners around the world who are applying planning innovations, the web-based mapping tool framework and individual Coastal Resilience “apps” or plugins to the framework to coastal hazards and adaptation issues. 

Copyright (C) 2013 The Nature Conservancy


## Static Site Conversion (**work in progress**)
This project is actively being converted into a static site and away from using .NET on the `feature/task-1` branch. During this time, the project will continue to work off `develop` via the typical set up in Visual Studio on Windows. It may break with Visual Studio on `feature/task-1` and its child branches.

*Note the static site port is 54634 instead of 54633*

### Run a python development environment
To run the project locally, on any OS, clone the repo and ensure you have `Python 2.x`. You can choose to work on your host machine or within a docker container. It is advised to work within docker if you'd rather not adjust your local python setup.

#### Host
Ensure `pip` is installed.

Install the python requirements:
```python ./scripts/update.py```

Run the development server and serve the static assets:
```python ./scripts/server.py```


#### Docker container
Ensure [`docker`](https://www.docker.com/) and `docker-compose` are installed and that the docker client is running.

The same commands as above will run within docker if passed a docker flag, `-d`:

Build the docker container with dependencies installed and serve the static assets:
```python ./scripts/server.py -d```

If requirements should change, dependencies can be updated via script:
```python ./scripts/update.py -d```

Containers can be accessed by bash in the usual way:
```docker-compose exec <container_name> /bin/bash```

To stop the docker server:
```docker-compose stop server```

#### Ports

| Service            | Port                              |
| ------------------ | --------------------------------- |
| Python Dev Server  | [`54634`](http://localhost:54634) |

#### Scripts

Prefix script calls with `python`, if python is not in your `$PATH`.

| Name               | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `server.py`        | Run a Python SimpleHTTPServer serving the templated app       |
| `update.py`        | Install python dependencies                                   |
| `create_static.py` | Write and compile static assets directly                      |