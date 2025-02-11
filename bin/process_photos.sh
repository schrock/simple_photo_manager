#! /bin/bash

# cd to installation directory
get_script_dir () {
	SOURCE="${BASH_SOURCE[0]}"
	# While $SOURCE is a symlink, resolve it
	while [ -h "$SOURCE" ]; do
		DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
		SOURCE="$( readlink "$SOURCE" )"
		# If $SOURCE was a relative symlink (so no "/" as prefix, need to resolve it relative to the symlink base directory
		[[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
	done
	DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
	echo "$DIR"
}
cd $(get_script_dir)/..

source ./conf/config

TMP_FILE="files.tmp"
LOG_FILE="process.log"

rm -f "$TMP_FILE"
rm -f "$LOG_FILE"

find $UNPROCESSED -type f -regex '.*\.\(jpg\|JPG\|jpeg\|JPEG\|png\|PNG\|gif\|GIF\|mp4\|MP4\)$' ! -path '*/.thumbnails/*' > "$TMP_FILE"
while read -r filepath; do
	# derive id using exif data
	id=`exiftool -createdate "$filepath" | cut -d ':' -f 2- | sed 's/[[:space:]]//g;s/://g;s/-//g' | cut -c 1-14`
	# add 00 subseconds by default
	id="${id}00"
	alt_id=`exiftool -filemodifydate "$filepath" | cut -d ':' -f 2- | sed 's/[[:space:]]//g;s/://g;s/-//g' | cut -c 1-14`
	# add 00 subseconds by default
	alt_id="${alt_id}00"
	if [[ ! "$id" =~ ^[1-9][0-9]{15}$ ]]; then
		echo "WARNING: Using alt id $alt_id for: $filepath" | tee -a "$LOG_FILE"
		id="${alt_id}"
	fi
	# check id format
	if [[ "$id" =~ ^[1-9][0-9]{15}$ ]]; then
		# convert extension to lower case and simplify
		ext="${filepath##*.}"
		ext="${ext,,}"
		[[ "$ext" == "jpeg" ]] && ext="jpg"
		new_filename=${id}.${ext}
		new_filepath=$PROCESSED/$new_filename
		while [ -f "$new_filepath" ]; do
			# add 1 to id if new file exists
			id=$(($id + 1))
			new_filename=${id}.${ext}
			new_filepath=$PROCESSED/$new_filename
		done
		echo "mv \"$filepath\" \"$new_filepath\"" | tee -a "$LOG_FILE"
		mv "$filepath" "$new_filepath"
	else
		# bad or no exif data
		echo "ERROR: Invalid exif data: $filepath" | tee -a "$LOG_FILE"
	fi
done < "$TMP_FILE"

# create thumbnails for jpg, png, gif files
find $PROCESSED -maxdepth 1 -type f -regex '.*\.\(jpg\|png\|gif\)$' > "$TMP_FILE"
find $TRASH -maxdepth 1 -type f -regex '.*\.\(jpg\|png\|gif\)$' >> "$TMP_FILE"
while read -r filepath; do
	filename=${filepath##*/}
	thumbnail="${THUMBNAILS}/${filename}.jpg"
	if [[ ! -f "$thumbnail" ]]; then
		echo "Creating thumbnail at $thumbnail" | tee -a "$LOG_FILE"
		convert -thumbnail x200 -quality 80 -auto-orient "$filepath" "$thumbnail" |& tee -a "$LOG_FILE"
	fi
done < "$TMP_FILE"

# create thumbnails for mp4 files
find $PROCESSED -maxdepth 1 -type f -regex '.*\.\(mp4\)$' > "$TMP_FILE"
find $TRASH -maxdepth 1 -type f -regex '.*\.\(mp4\)$' >> "$TMP_FILE"
while read -r filepath; do
	filename=${filepath##*/}
	thumbnail="${THUMBNAILS}/${filename}.jpg"
	if [[ ! -f "$thumbnail" ]]; then
		echo "Creating thumbnail at $thumbnail" | tee -a "$LOG_FILE"
		ffmpeg -nostdin -hide_banner -loglevel error -y -i "$filepath" -vf "thumbnail=120,scale=w=-1:h=200" -frames:v 1 -q:v 5 "$thumbnail" |& tee -a "$LOG_FILE"
	fi
done < "$TMP_FILE"

