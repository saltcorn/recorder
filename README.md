# recorder

This is a module for recording video and/or audio through the browser's access to your camera and/or microphone, respectively

## Recorder Fileview 

To use this, create a table with a file field and and Edit view on this table. Select `Recorder` as the fieldview for the file field

## ContinuousRecorder view pattern

If you want to make long recordings split across multiple files, use the ContinuousRecorder view pattern. Select again a table that has a File field
to use with this view pattern

## WavePlayer

This view pattern can be useful in browsing many audio files, It displays a spectrogram with a play button below for each file in the current view state selection (use together with a Filter to restrict the rows shown)