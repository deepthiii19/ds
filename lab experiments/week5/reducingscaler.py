import pandas as pd
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt

tips=sns.load_dataset("tips")
numeric_cols=tips.select_dtypes(include=['float64','int64'])
scaler= StandardScaler()
scaled_data=scaler.fit_transform(numeric_cols)
pca=PCA(n_components=2)
pca_result=pca.fit_transform(scaled_data)

pca_df=pd.DataFrame(data=pca_result,columns=['PC1','PC2'])
print("Explained variance ratio:",pca.explained_variance_ratio_)
print("\nPCA Result(first 5 rows):")
print(pca_df.head())
plt.scatter(pca_df['PC1'],pca_df['PC2'],alpha=0.7)
plt.xlabel('Principal Component 1')
plt.ylabel('Principal Component 2')
plt.title('PCA Projection of Tips Dataset')
plt.show()
