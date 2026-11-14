
import React, { useCallback, useEffect, useState } from "react";

import { BackHandler, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import { showcases } from "./src/data/showcases";

function AppContent() {
	const insets = useSafeAreaInsets();

	const [activeShowcaseId, setActiveShowcaseId] = useState<string | null>(null);

	const activeShowcase = showcases.find(item => item.id === activeShowcaseId);
	const ActiveShowcase = activeShowcase?.component;

	const handleOpen = useCallback((id: string) => {
		setActiveShowcaseId(id);
	}, []);

	const handleBack = useCallback(() => {
		setActiveShowcaseId(null);
	}, []);

	useEffect(() => {
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
			if (!activeShowcaseId) return false;
			handleBack();
			return true;
		});

		return () => subscription.remove();
	}, [activeShowcaseId, handleBack]);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" />

			{ActiveShowcase ? (
				<ActiveShowcase />
			) : (
				<HomeScreen onSelect={handleOpen} />
			)}

			{ActiveShowcase && (
				<Pressable
					onPress={handleBack}
					hitSlop={10}
					style={[styles.backButton, { top: insets.top + 12 }]}
				>
					<Text style={styles.backIcon}>‹</Text>
				</Pressable>
			)}
		</View>
	);
}

export default function App() {
	return (
		<GestureHandlerRootView style={styles.container}>
			<SafeAreaProvider>
				<AppContent />
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#101114",
	},
	backButton: {
		position: "absolute",
		left: 20,
		width: 44,
		height: 44,
		borderRadius: 15,
		backgroundColor: "rgba(35,35,38,0.85)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.12)",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 100,
		elevation: 10,
	},
	backIcon: {
		color: "#FF9B4A",
		fontSize: 36,
		fontWeight: "300",
		lineHeight: 39,
		marginTop: -4,
	},
});
