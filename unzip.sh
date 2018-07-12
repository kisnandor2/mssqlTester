#!/bin/bash

ZIPPED_SUBMISSIONS_FOLDER=$(grep ZIPPED_SUBMISSIONS_FOLDER config.json -m1 | cut -f2 -d: | cut -f2 -d\")
if [ "$ZIPPED_SUBMISSIONS_FOLDER" == "" ]; then
	ZIPPED_SUBMISSIONS_FOLDER="./submissions"
fi

UNZIPPED_SUBMISSIONS_FOLDER=$(grep UNZIPPED_SUBMISSIONS_FOLDER config.json -m1 | cut -f2 -d: | cut -f2 -d\")
if [ "$UNZIPPED_SUBMISSIONS_FOLDER" == "" ]; then
	UNZIPPED_SUBMISSIONS_FOLDER="./unzipped_submissions"
fi

if [ "$ZIPPED_SUBMISSIONS_FOLDER" == "$UNZIPPED_SUBMISSIONS_FOLDER" ]; then
	UNZIPPED_SUBMISSIONS_FOLDER="unzipped_$UNZIPPED_SUBMISSIONS_FOLDER"
fi

#Unzip all ZIP files
find $ZIPPED_SUBMISSIONS_FOLDER/ ! -path $ZIPPED_SUBMISSIONS_FOLDER/ -iname "*.zip" | while read fileName; do
	unzip -u "$fileName" -d $UNZIPPED_SUBMISSIONS_FOLDER #> /etc/null
done

#No rar files should be uploaded
exit

#Unrar all RAR files
for file in $ZIPPED_SUBMISSIONS_FOLDER/*.rar; do
  fileName=$(echo $file | cut -d"/" -f3)
  echo $fileName
  unrar e $ZIPPED_SUBMISSIONS_FOLDER/$fileName $UNZIPPED_SUBMISSIONS_FOLDER
done