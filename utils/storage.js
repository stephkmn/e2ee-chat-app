import * as SecureStore from 'expo-secure-store';

// Save chat key using SecureStore
// chatID = string, key = string
export async function saveChatKey(chatId, key){
    try{
        // SecureStore - stores a key-value pair
        //               returns promise, rejected if value can't be stored on device
        await SecureStore.setItemAsync(key, chatId)

        console.log("Key has successfully saved.")
    }
    catch(error){
        console.error(error);
    }
    
}

// Get chat keys 
export async function getChatKey(chatID) {
    // fetch key associated with chatID
    let result = await SecureStore.getItemAsync(chatID)
    if (result){
        return alert("Here is your chat key: " + result)
    }
    // result = null, no keys assoc. with ID
    else{
         alert("No chat keys found for: " + chatID)
    }
}

