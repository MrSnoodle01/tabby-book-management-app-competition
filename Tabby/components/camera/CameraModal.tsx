import { View, Text, Pressable, Modal, TouchableWithoutFeedback, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Book } from '@/types/book';

interface CameraModalProps {
    closeModal: () => void;
    onBookSelectionStart: (tempBooks: Book[], isShelf: boolean) => void;
}

type apiReturn = {
    authors: string         // separated by commas
    excerpt: string
    isbn: string            // guaranteed to be provided, ISBN 13
    page_count: number      // -1 if not given
    published_date: string  // YYYY-MM-DD
    publisher: string
    rating: number          // -1.0 if not given
    summary: string
    thumbnail: string
    title: string
};

const gpuUrl = process.env.EXPO_PUBLIC_GPU_API_URL;
const cpuUrl = process.env.EXPO_PUBLIC_CPU_US_API_URL;

const CameraModal: React.FC<CameraModalProps> = ({ closeModal, onBookSelectionStart }) => {
    // const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    // use to disable the buttons temporarily when clicking them to prevent multiple clicks
    const [isProcessing, setIsProcessing] = useState(false);
    // used to determine if the user is currently choosing which book is the correct one
    const [userChoosing, setUserChoosing] = useState(false);

    // Handle taking a picture by requesting permissions before taking the picture if necessary
    const handleTakePicture = async () => {
        setIsProcessing(true);
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
            setIsProcessing(false);
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: .4,
        });

        if (!result.canceled) {
            const returnedBooks = await uploadImage(result.assets[0].uri);
            if (returnedBooks)
                // if returned books is not empty
                if (returnedBooks.length > 0) {
                    await userPickBook(returnedBooks, false);
                }
        }
        setIsProcessing(false);
    };

    // Handle picking an image from the gallery by requesting permissions before picking the image if necessary
    const handlePickImage = async () => {
        setIsProcessing(true);
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
            setIsProcessing(false);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: .4,
        });

        if (!result.canceled) {
            const returnedBooks = await uploadImage(result.assets[0].uri);
            if (returnedBooks)
                await userPickBook(returnedBooks, false);


        }
        setIsProcessing(false);
    };

    // handle user sending in shelf image from camera roll
    const handlePickShelfImage = async () => {
        setIsProcessing(true);
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
            setIsProcessing(false);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: .4,
        });

        if (!result.canceled) {
            const returnedBooks = await uploadShelfImage(result.assets[0].uri);
            if (returnedBooks)
                await userPickBook(returnedBooks, true);
        }
        setIsProcessing(false);
    };
    // handle user sending in a shelf image
    const handleTakeShelfPicture = async () => {
        setIsProcessing(true);
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
            setIsProcessing(false);
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: .4,
        });

        if (!result.canceled) {
            const returnedBooks = await uploadShelfImage(result.assets[0].uri);
            if (returnedBooks)
                await userPickBook(returnedBooks, true);
        }
        setIsProcessing(false);
    };

    // uploads image to scan_shelf endpoint
    const uploadShelfImage = async (imageUri: string) => {
        try {
            console.log("Sending koyeb image");
            // convert image to blob raw data
            const res = await fetch(imageUri);
            const blob = await res.blob();
            // fetch titles and authors from scan_cover
            const books = await fetch(`${gpuUrl}/books/scan_shelf?nosearch=false`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: blob,
            });

            // show user books that were found from shelf
            let returnedBooks: Book[] = [];
            if (books.ok) {
                console.log('success');
                const result = await books.json();
                console.log("books from shelf: \n\n\n", result, "\n\n\n");
                for (let i = 0; i < result.titles.length; i++) {


                    const url = new URL(`${cpuUrl}books/search`);
                    // check if title is empty if it do not append
                    if (result.titles[i] !== "") {
                        url.searchParams.append('author', result.authors[i]);
                    }
                    // check if title is empty if it do not append
                    if (result.titles[i] !== "") {
                        url.searchParams.append('title', result.titles[i]);
                    }

                    // fetch books from US server
                    console.log(url);
                    // check if both title and author are empty if so skip making search
                    if (result.titles[i] === "" && result.authors[i] === "") {
                        continue;
                    }
                    const response = await fetch(url);

                    if (response.ok) {
                        const temp = await response.json();
                        // add first 3 returned books
                        if (temp.results[0])
                            returnedBooks.push(jsonToBook(temp.results[0]));
                        if (temp.results[1] && returnedBooks.findIndex(c => c.isbn === temp.results[1].isbn))
                            returnedBooks.push(jsonToBook(temp.results[1]));
                        if (temp.results[2] && returnedBooks.findIndex(c => c.isbn === temp.results[2].isbn))
                            returnedBooks.push(jsonToBook(temp.results[2]));
                    } else {
                        console.log("error with searches: ", response.status);
                        const errorText = await response.text();
                        console.log("error details: ", errorText);
                    }
                }
            } else {
                console.error("error uploading image: ", books.status);
                const errorText = await books.text();
                console.error("Error details: ", errorText);
                Alert.alert("Failed to upload image. Please try again");
            }
            // show error if no books were found on an okay response
            if (returnedBooks.length === 0 && books.ok) {
                Alert.alert("No books found. Please try again");
            }
            return returnedBooks;
        } catch (error) {
            console.error("Catch Error uploading image:", error);
            Alert.alert("Failed to upload image. Please try again");
        }
    }

    // for testing activity indicator
    async function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Opens modal for user to select correct book
    const userPickBook = async (bookArr: Book[], isShelf: boolean) => {
        setUserChoosing(true);

        // DONT REMOVE THIS SLEEP
        // idk why but if you remove it then shit breaks
        await sleep(1000);

        if (onBookSelectionStart) {
            onBookSelectionStart(bookArr, isShelf);
        }
    }

    // uploads image to scan_cover endpoint
    const uploadImage = async (imageUri: string) => {
        try {
            console.log("Sending koyeb image");

            // convert image to blob raw data
            const res = await fetch(imageUri);
            const blob = await res.blob();

            // fetch title and author from scan_cover
            const titles = await fetch(`${gpuUrl}books/scan_cover?nosearch=false`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: blob,
            });

            if (titles.ok) {
                const book = await titles.json();
                const url = new URL(`${cpuUrl}books/search`);

                // check if title is empty if it is do not append
                const bookTitleIsEmpty = book.title === "" || null || undefined;
                const bookAuthorIsEmpty = book.author === "" || null || undefined;
                if (!bookTitleIsEmpty) {
                    url.searchParams.append('title', book.title);
                }
                // check if author is empty if it is do not append
                if (!bookAuthorIsEmpty) {
                    url.searchParams.append('author', book.author);
                }

                // check if both title and author are empty if so skip making search and just return empty array 
                if (bookTitleIsEmpty && bookAuthorIsEmpty) {
                    Alert.alert("No books found. Please try again");
                    const emptyBooksArray: Book[] = [];
                    return emptyBooksArray;
                }
                // fetch books from US server
                const response = await fetch(url);

                // add first 4 returned books to an array which are the books that the user can choose from
                let returnedBooks: Book[] = [];
                if (response.ok) {
                    console.log('success');
                    const result = await response.json();
                    for (let i = 0; i < result.results.length; i++) {
                        const book = jsonToBook(result.results[i]);
                        // ensure no duplicate isbn
                        if (returnedBooks.findIndex(c => c.isbn === book.isbn)) {
                            returnedBooks.push(book);
                        }
                    }
                } else {
                    console.error("error uploading author and title: ", response.status);
                    const errorText = await response.text();
                    console.error("Error details: ", errorText);
                    Alert.alert("Something went wrong with uploading author and title. Please try again.");
                }
                if (returnedBooks.length === 0 && response.ok) {
                    Alert.alert("No books found. Please try again");
                }
                return returnedBooks;
            } else {
                console.error("error uploading image: ", titles.status);
                const errorText = await titles.text();
                console.error("Error details: ", errorText);
                Alert.alert("Something went wrong with uploading image. Please try again.");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            Alert.alert("Something went wrong. Please try again.");

        }
    };

    let counter = 0;

    // returns a Book object from json given by google books
    const jsonToBook = (bookjson: apiReturn) => {
        const returnBook: Book = {
            id: `tempid${counter++}`,
            isbn: bookjson.isbn,
            title: bookjson.title,
            author: bookjson.authors,
            excerpt: bookjson.excerpt,
            summary: bookjson.summary,
            image: bookjson.thumbnail,
            pageCount: bookjson.page_count,
            publishedDate: bookjson.published_date,
            publisher: bookjson.publisher,
            // rating: bookjson.rating, (cant do rating like this)
            isFavorite: false,
        }
        return returnBook;
    }

    return (
        <Modal animationType="fade" transparent visible={!userChoosing}>
            <TouchableWithoutFeedback onPress={closeModal} disabled={isProcessing}>
                <View className="flex-1 justify-center items-center bg-black/50">
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-lg w-64 p-4 space-y-4">
                            {isProcessing && <ActivityIndicator size='large' color='#0000ff' />}
                            <Pressable
                                onPress={handleTakePicture}
                                disabled={isProcessing}
                                className={`p-2 rounded items-center bg-blue-500`}
                                testID="takePictureButton"
                            >
                                <Text className="text-white">Take picture of a single book</Text>
                            </Pressable>
                            <Pressable
                                onPress={handlePickImage}
                                disabled={isProcessing}
                                className={`p-2 rounded items-center bg-blue-500`}
                                testID="pickPhotoButton"
                            >
                                <Text className="text-white">Upload image of a single book</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleTakeShelfPicture}
                                disabled={isProcessing}
                                className={`p-2 rounded items-center bg-blue-500`}
                            >
                                <Text className="text-white">Take picture of a book shelf</Text>
                            </Pressable>
                            <Pressable
                                onPress={handlePickShelfImage}
                                disabled={isProcessing}
                                className={`p-2 rounded items-center bg-blue-500`}
                            >
                                <Text className="text-white">Upload image of a book shelf</Text>
                            </Pressable>
                            <Pressable
                                onPress={closeModal}
                                className="p-2 bg-red-500 rounded items-center"
                                disabled={isProcessing}>
                                <Text className="text-white">Cancel</Text>
                            </Pressable>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default CameraModal;
