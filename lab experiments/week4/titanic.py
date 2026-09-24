
import seaborn as sns
titanic=sns.load_dataset("titanic")
print(titanic.head())
print(titanic.describe())
print(titanic.info())
titanic['age'].fillna(titanic['age'].medain(),inplace=True)
print("Data shape:",titanic.shape)
objective ="Classification : Survived(Yes/No)"
success_criteria="Accuracy>80%"
constraints="Limited features, missing values,imbalanced classes"
print("Objective ",objective)
print("Sucess Criteria", success_criteria)
print("Constraintes",constraints)