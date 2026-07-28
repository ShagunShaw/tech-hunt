iss file mei we will check whether 'isStarted= true' h ya ni


isRunning = false → block(handles game not started and super- admin ended it, both)
isRunning = true AND currentTime - startTime < duration → allow
isRunning = true AND currentTime - startTime >= duration → block(auto end)

Additionally, also update the duartion value from 3 hr to(currentTime - StartTime) if super- admin ends the game, in the db, for any future reference, that exactly how much duration had been given to the game