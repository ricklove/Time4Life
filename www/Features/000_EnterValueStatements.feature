Feature: Enter Value Statements
In order to feel Hope that I can Balance My Life
So that I can overcome an Spending too Much Time on Unimportant Activities
As a user,
I can Type in My Value Statements


Scenario: Should View the First Value Question

	Given this is the first run
	When the app is loaded
	Then I can see the first value question

Scenario: Should Answer the First Value Question

	Given the first value question is displayed
	Then I can type in my answer

Scenario: Should View a Value Question

	Given I have gone to a question
	Then I can see the first question

Scenario: Should Answer the First Value Question

	Given a value question is displayed
	Then I can type in my answer

Scenario: Should Go to the Next Value Question

	Given a value question is displayed
	When I am done typing the answer
	Then I will go to the next question

Scenario: Should Go to the Values Summary

	Given I am on the last value question
	When I am done typing the answer
	Then I will go to the values summary

Scenario: Should View the Values Summary

	Given I all the answers have been answered or skipped
	When I go to the value questions
	Then I can see a summary of all questions and their answers

Scenario: Should Edit an Answer

	Given the values summary is displayed
	When I want to edit an answer
	Then I can type in edits to my answer





