GeositeFramework Installer Builder
==================================

Overview
--------

The goal of this feature is to build a tool that will make it easier for:  
1) Developers to spin-up development environments to build plugins  
2) Anyone to create installers from the latest source code for Geosite   
   Framework, Plugins, and the Regional Site Config.  

In order to accomplish this, a portable staging environment will be created   
with scripts that can accomplish these tasks and the resources needed.

Development Environments
------------------------

The script will automate:  
1) Creating a staging folder with a pre-compiled, vanilla GeositeFramework    
2) Cloning the various client-hosted repos    
3) Copying the necessary assets from the client repos for customizing the framework    

...  
From there, the user can modify files within the workspace until they are satisfied  
with the changes.  
...  

4) Pluck the modified plugin/config files and drop them into the client-hosted repo folders  

...  
From there, the user can commit these files back to their repo. Then, once committed,  
they can run the installer creator.  
...  
  
Creating Installers
-------------------

This script would automate the installer-building equivalents of 1, 2, and 3 above.  
It would then run the NSIS utilities to make an executable installer from the freshly  
merged directory.  

Asset Details
-------------
Details on the structure of all the pieces that will fit together.

#### Portable Staging Environment
- Contains:
  - Python Build Script
  - zipped up, compiled Geosite Framework
- Uses:
  - A staging directory for the build utility
  - A nested working directory for plugin developers
- Responsible Party:
  - Azavea

#### Plugins Repo
- Contains:
  - Folders that match the name of plugins, each containing entire plugin source
- Uses:
  - A repo for storing the source code of client-created plugins
  - A build tool from which plugins will be extracted and rolled into Regional Sites
- Responsible Party:
  - TNC

#### Config Repo
- Contains:
  - Folders that match the name of Regional sites, each containing:
    - a configuration file for each plugin that it uses, of the format <pluginname>.json
    - an installer.nsi file (????)
- Uses:
  - A repo for storing the source code of client-created plugins
  - A build tool from which plugins will be extracted and rolled into Regional Sites
- Responsible Party:
  - TNC

Technical Details (under construction)
--------------------------------------

This section describes how the build process takes place.

#### Setup
We would deliver the Portable Staging Environment, with a recommended extraction point  
of C:\Geosite. The user would then clone the Plugins Repo and Config Repo into the  
staging environment.

#### Development / Deployment
From here, the user can choose between creating a development environment  
or deploying from the latest source of each repo. Using:  

```python build-script.py --setup-dev```  
 or    
```python build-script.py --make-installer```  

#### Build Steps
Depending on their choice, the following steps will take place either in a newly created  
workspace directory within the staging environment, or in a temporary folder:  
- create a Workspace directory within the stating environment
- Unpack the GeositeFramework into the workspace directory
- copy the site configuration files from the Config directory into the GeositeFramework
- grab the ```region.json``` config from the Config/<RegionalSite> folder
- parse the region data for included plugins and for each plugin:
  - copy the plugin into the workspace from the Plugin repo
  - copy the plugin customizations from the Config repo into the workspace plugin


#### Model Directory Structure:

- C:\Geosite\  
  - Workspace\  
    - (RegionalSite Name)
  - Plugins\  
  - Config\  
  - build-script.py  
  - geosite_framework.zip  

