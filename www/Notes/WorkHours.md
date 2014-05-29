~~~
// Actual Work Time Periods and Immediate Tasks
~~~

# Version 1

## Hour 1

### 2014-05-28 6:20-6:25 Plan

- What is the most important thing to accomplish this hour?

	I want to setup the basic project structure:

	- as an HTML5 app hosted online using GitHub and Git2Site to publish online 
	- and as native apps using Marmalade Web to test, deploy, and publish

### 6:25-6:45 

- Create an empty HTML5 project

### 6:45-7:15

- Define the EnterValueStatements feature

### 7:15-7:25 Summary

- Define next tasks
- Write Summary:

	I set up the project and defined the first feature. 

	I also improved my working process in various small ways:

	- I started with an empty project and will not have any unintended junk added by accident
	- I simplified the Notes 
		- (I still need to think about how to contribute to a developer's blog in process)
	- I ensured to start with feature definitions first 
		- (I have not done the benefit's analysis yet - but the benefits are obvious to me for this project)
	- I added plan and summary to this work hours to help maintain intentions

## Unstructured

### 8:41-8:48

- Restructure this WorkHours file

### 8:49-8:53 !Marmalade

- Install Marmalade SDK

### 8:54-8:59

- Add time estimates to all tasks
- Add time estimates to the EnterValueStatements feature

### 10:45-11:22 !Marmalade

- Create Marmalade Project
- Documented Using Junctions to keep a clean project structure


## Hour 2

### 2014-05-29 6:19-6:24 Plan

- What is the most important thing to accomplish this hour?

	I will implement the test framework this hour.

### 6:24-7:00

- Include the testing framework (15)
	- Import the required files
	- Setup the first scenario test to the point of failure

### 7:01-7:33

- Begin: Create the first EnterValueStatements feature scenario test (10)

### 7:34-7:39 Summary

	Implementing the test framework is taking longer than expected to get all the initial structure in place. 
	A more complete project template is needed that will include all the latest framework.

	I spent some time extending the system:

	- Add a timeout to any tests that do not call done() for the test framework
	- Add interfaces for the ViewModels in the _Model.ts
	- The _Model.ts interfaces should be a complete definition for the View bindings and for testing
	- Change the naming scheme for the ViewModels to have a simple VM or IVM prefix for their definitions

### 7:40-7:43

- Straighten up the tests


## Unstructured

### 8:57-9:13 !TestFramework
### 9:40-10:00 !TestFramework

- Refactor Test writing

### 10:00-11:24 !TestFramework

- Begin: Extend the testing framework to load feature files and compare them to the written tests to make sure all features are being tested (30)

### 12:45-13:15 !TestFramework

- Fix Async running of FeatureFile Loading

### 13:15-13:35 !TestFramework

- Parse the Feature Files

### 13:36-14:15 !TestFramework

- Compare the feature definitions to the tested features

---
# FUTURE TASKS

- Complete benefits analysis (30)



- Extend the testing framework to load feature files and compare them to the written tests to make sure all features are being tested (30)
- Create and implement the EnterValueStatements feature scenarios (70)

- Add Github files: README and LICENSE (5)