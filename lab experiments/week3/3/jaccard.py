def jaccard_index(str1,str2):
    set1,set2=set(str1.split()),set(str2.split())
    interaction=set1.intersection(set2)
    union=set1.union(set2)
    return len(interaction)/len(union)
s1="abc"
s2="xyz "
print("Jaccard Index:",jaccard_index(s1,s2))