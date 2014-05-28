~~~
// Developer Notes
~~~

### File System Junction to keep a clean Project Folder Structure

In order to keep the webassets in the root of the project, instead of nested in Marmalade, I set up a file system junction:
http://devtidbits.com/2009/09/07/windows-file-junctions-symbolic-links-and-hard-links/

Set up a junction from webassets to www:
- Open cmd prompt
- Change to root directory for the project
- Make a junction:

	mklink /J Marmalade\Time4Life\data\webassets www


