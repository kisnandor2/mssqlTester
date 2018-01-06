#!/bin/bash

#Unzip all ZIP files
find ./submissions/ ! -path ./submissions/ -iname "*.zip" | while read fileName; do
	unzip -o "$fileName" -d ./ #> /etc/null
done

#No rar files should be uploaded
exit

#Unrar all RAR files
for file in ./submissions/*.rar; do
  fileName=$(echo $file | cut -d"/" -f3)
  echo $fileName
  unrar e ./submissions/$fileName ./submissions
  rm ./submissions/$fileName
done