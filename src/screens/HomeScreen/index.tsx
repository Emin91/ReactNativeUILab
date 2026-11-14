
import React, { type FC } from "react";

import { Pressable, ScrollView, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { showcases } from "../../data/showcases";

import { styles } from "./styles";

type THomeScreenProps = {
	onSelect: (id: string) => void;
};

const HomeScreen: FC<THomeScreenProps> = ({ onSelect }) => {
	return (
		<View style={styles.container}>
			<SafeAreaView edges={["top"]}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.content}
				>
					<View style={styles.header}>
						<Text style={styles.label}>COMPONENT LIBRARY</Text>
						<Text style={styles.heading}>
							Playground<Text style={styles.accent}>.</Text>
						</Text>
						<Text style={styles.subtitle}>
							Explore creative UI experiments
						</Text>
					</View>

					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Experiments</Text>
						<View style={styles.countBadge}>
							<Text style={styles.countText}>
								{showcases.length} ITEMS
							</Text>
						</View>
					</View>

					<View style={styles.list}>
						{showcases.map((item, index) => (
							<Pressable
								key={item.id}
								onPress={() => onSelect(item.id)}
								android_ripple={{ color: "#36291E" }}
								style={styles.card}
							>
								<View style={styles.numberBox}>
									<Text style={styles.numberText}>
										{String(index + 1).padStart(2, "0")}
									</Text>
								</View>

								<View style={styles.cardContent}>
									<Text style={styles.cardTitle} numberOfLines={2}>
										{item.title}
									</Text>
								</View>

								<View style={styles.arrowBox}>
									<Text style={styles.arrowText}>↗</Text>
								</View>
							</Pressable>
						))}
					</View>

					<Text style={styles.footer}>
						CRAFTED FOR EXPERIMENTATION
					</Text>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
};

export default HomeScreen;
